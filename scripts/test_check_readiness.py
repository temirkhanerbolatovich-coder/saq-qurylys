"""Safety and failure-path checks for the read-only local demo diagnostic."""

import contextlib
import importlib.util
import io
import json
import subprocess
import tempfile
import unittest
from pathlib import Path
from unittest.mock import patch
from urllib.error import HTTPError

SPEC = importlib.util.spec_from_file_location('check_readiness', Path(__file__).with_name('check_readiness.py'))
readiness = importlib.util.module_from_spec(SPEC)
SPEC.loader.exec_module(readiness)


class ReadinessTests(unittest.TestCase):
    def setUp(self):
        self.ids = {service: str(index) * 64 for index, service in enumerate(readiness.SERVICES, 1)}
        self.states = {
            service: {
                'image': 'sha256:' + 'a' * 64,
                'running': True,
                'paused': False,
                'health': 'healthy' if service in ('api', 'db') else None,
                'labels': {
                    'com.docker.compose.project': 'saq-qurylys',
                    'com.docker.compose.service': service,
                    'com.docker.compose.project.working_dir': str(readiness.ROOT),
                },
                'ports': {'3000/tcp': [{'HostIp': '127.0.0.1', 'HostPort': '3000'}]},
            }
            for service in readiness.SERVICES
        }
        self.runtime = {'config': True, 'storage': True, 'local_auth': True, 'health': True, 'ocr': True, 'pdf': True}
        self.commands = []

    def fake_run(self, command, timeout):
        self.commands.append(command)
        if command[1] == 'info':
            return 'linux\n'
        if command[1:3] == ['compose', 'version']:
            return 'v2.40.0\n'
        if command[-2:] == ['config', '--images']:
            return 'postgres:17.9-bookworm\nsaq-qurylys-api\nsaq-qurylys-worker\nsaq-qurylys-frontend\n'
        if command[1:3] == ['image', 'inspect']:
            return 'sha256:' + 'a' * 64
        if command[-4:-1] == ['ps', '--all', '-q']:
            return self.ids[command[-1]]
        if command[1] == 'inspect':
            service = next(service for service, identity in self.ids.items() if identity == command[-1])
            return json.dumps(self.states[service])
        if command[1] == 'exec':
            return json.dumps(self.runtime)
        self.fail('Unexpected command in read-only diagnostic')

    def diagnose(self):
        with (
            patch.object(readiness, 'run', side_effect=self.fake_run),
            patch.object(readiness, 'frontend_available', return_value=True),
        ):
            return readiness.diagnose()

    def test_available_prerequisites_keep_external_services_unverified(self):
        report = self.diagnose()
        self.assertTrue(report['local_prerequisites_ready'])
        self.assertEqual(report['external_dependencies']['status'], 'NOT_CHECKED')
        self.assertTrue(report['limitations'])
        for command in self.commands:
            self.assertFalse({'build', 'pull', 'up', 'down', 'restart', 'rm', 'pause', 'unpause'} & set(command))

    def test_missing_docker_is_a_safe_blocker_without_traceback(self):
        with patch.object(readiness.subprocess, 'run', side_effect=FileNotFoundError('private-path')):
            report = readiness.diagnose()
        self.assertFalse(report['local_prerequisites_ready'])
        self.assertIn('не найдена', report['checks'][0]['message'])
        self.assertNotIn('private-path', json.dumps(report))

    def test_timeout_suppresses_command_output_and_is_actionable(self):
        error = subprocess.TimeoutExpired(
            ['docker', 'secret-command'], 5, output='secret-output', stderr='secret-token'
        )
        with patch.object(readiness.subprocess, 'run', side_effect=error):
            report = readiness.diagnose(5)
        self.assertFalse(report['local_prerequisites_ready'])
        self.assertIn('срок', report['checks'][0]['message'])
        self.assertNotIn('secret', json.dumps(report))

    def test_failed_command_never_echoes_secrets_in_stdout_stderr_or_arguments(self):
        completed = subprocess.CompletedProcess(['docker', 'secret-argument'], 1, 'SECRET_PASSWORD', 'PRIVATE_TOKEN')
        output = io.StringIO()
        with patch.object(readiness.subprocess, 'run', return_value=completed), contextlib.redirect_stdout(output):
            self.assertEqual(readiness.main([]), 1)
        self.assertNotIn('SECRET_PASSWORD', output.getvalue())
        self.assertNotIn('PRIVATE_TOKEN', output.getvalue())
        self.assertNotIn('secret-argument', output.getvalue())

    def test_unhealthy_api_blocks_readiness_and_is_not_execed(self):
        self.states['api']['health'] = 'unhealthy'
        report = self.diagnose()
        self.assertFalse(report['local_prerequisites_ready'])
        self.assertFalse(any(command[1] == 'exec' and command[2] == self.ids['api'] for command in self.commands))
        self.assertTrue(any(check['name'] == 'api_runtime' and check['status'] == 'FAIL' for check in report['checks']))

    def test_foreign_checkout_never_receives_exec(self):
        self.states['worker']['labels']['com.docker.compose.project.working_dir'] = str(readiness.ROOT / 'other')
        report = self.diagnose()
        self.assertFalse(report['local_prerequisites_ready'])
        self.assertFalse(any(command[1] == 'exec' and command[2] == self.ids['worker'] for command in self.commands))

    def test_missing_ocr_pdf_and_public_origin_remain_explicit_blockers(self):
        self.runtime.update(ocr=False, pdf=False, local_auth=False)
        report = self.diagnose()
        failed = {check['name'] for check in report['checks'] if check['status'] == 'FAIL'}
        self.assertTrue({'ocr_languages', 'pdf_runtime', 'local_auth_config'} <= failed)
        self.assertFalse(report['local_prerequisites_ready'])

    def test_report_is_exclusive_and_does_not_overwrite_previous_evidence(self):
        with tempfile.TemporaryDirectory() as folder:
            target = Path(folder) / 'report.json'
            readiness.save_report(target, {'original': True})
            with self.assertRaises(FileExistsError):
                readiness.save_report(target, {'original': False})
            self.assertEqual(json.loads(target.read_text(encoding='utf-8')), {'original': True})

    def test_frontend_redirect_is_refused_without_contacting_target(self):
        with patch.object(readiness, 'build_opener') as opener:
            opener.return_value.open.side_effect = HTTPError('http://127.0.0.1:3000/login', 302, 'Redirect', {}, None)
            self.assertFalse(readiness.frontend_available(3000, 5))
            self.assertEqual(opener.return_value.open.call_count, 1)
        self.assertIsNone(readiness.NoRedirect().redirect_request(None, None, 302, '', {}, 'https://external.invalid'))


if __name__ == '__main__':
    unittest.main()
