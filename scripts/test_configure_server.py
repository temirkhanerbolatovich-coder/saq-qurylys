"""Verify HTTPS defaults, safe credential transfer and preservation of existing configuration."""

import argparse
import importlib.util
import sys
import tempfile
import unittest
from pathlib import Path

sys.path.insert(0, str(Path(__file__).parent))
SPEC = importlib.util.spec_from_file_location('configure_server', Path(__file__).with_name('configure_server.py'))
server = importlib.util.module_from_spec(SPEC)
SPEC.loader.exec_module(server)


class ConfigureServerTests(unittest.TestCase):
    def test_new_server_uses_https_without_seed_or_external_integrations(self):
        with tempfile.TemporaryDirectory() as directory:
            root = Path(directory)
            server.configure(root, 'saq.example.org')
            values = dict(line.split('=', 1) for line in (root / '.env').read_text().splitlines())
            self.assertEqual(values['APP_ORIGIN'], 'https://saq.example.org')
            self.assertEqual(values['SESSION_COOKIE_SECURE'], 'true')
            for key in ['DEMO_SEED_ENABLED', 'THREADS_SEARCH_ENABLED', 'TELEGRAM_ENABLED']:
                self.assertEqual(values[key], 'false')
            self.assertNotIn('COLLECTOR_ENABLED', values)
            self.assertNotIn('LLM_ENABLED', values)
            self.assertGreaterEqual(len(values['SESSION_SECRET']), 32)
            self.assertTrue((root / '.local/server-credentials.txt').is_file())

    def test_restore_preserves_login_but_rotates_db_and_session_secrets(self):
        with tempfile.TemporaryDirectory() as directory:
            root = Path(directory)
            source = root / 'source.env'
            source.write_text(
                'BOOTSTRAP_ANALYST_USERNAME=existing\nBOOTSTRAP_ANALYST_PASSWORD=old-secure-password-123\nSESSION_SECRET=old-secret\nTELEGRAM_BOT_TOKEN=must-not-copy\n'
            )
            server.configure(root, 'saq.example.org', credentials_from=source)
            text = (root / '.env').read_text()
            self.assertIn('BOOTSTRAP_ANALYST_USERNAME=existing\n', text)
            self.assertIn('BOOTSTRAP_ANALYST_PASSWORD=old-secure-password-123\n', text)
            self.assertNotIn('old-secret', text)
            self.assertNotIn('must-not-copy', text)

    def test_existing_configuration_or_credentials_are_not_overwritten(self):
        for relative in ['.env', '.local/server-credentials.txt']:
            with self.subTest(relative=relative), tempfile.TemporaryDirectory() as directory:
                root = Path(directory)
                existing = root / relative
                existing.parent.mkdir(parents=True, exist_ok=True)
                existing.write_text('retained')
                with self.assertRaises(FileExistsError):
                    server.configure(root, 'saq.example.org')
                self.assertEqual(existing.read_text(), 'retained')

    def test_invalid_hostnames_do_not_create_files(self):
        for hostname in [
            'https://saq.example.org',
            'saq.example.org:443',
            '127.0.0.1',
            'localhost',
            '../other',
            'saq.example.org\nmalicious',
            'bad_name.org',
            '*.example.org',
        ]:
            with self.subTest(hostname=hostname), tempfile.TemporaryDirectory() as directory:
                root = Path(directory)
                with self.assertRaises(ValueError):
                    server.configure(root, hostname)
                self.assertFalse((root / '.env').exists())

    def test_missing_or_unsafe_restore_credentials_fail_without_creating_config(self):
        for password in ['', 'short', 'long-password-$VARIABLE', 'long-password-#comment']:
            with self.subTest(password=password), tempfile.TemporaryDirectory() as directory:
                root = Path(directory)
                source = root / 'source.env'
                source.write_text(f'BOOTSTRAP_ANALYST_USERNAME=analyst\nBOOTSTRAP_ANALYST_PASSWORD={password}\n')
                with self.assertRaises(ValueError):
                    server.configure(root, 'saq.example.org', credentials_from=source)
                self.assertFalse((root / '.env').exists())

    def test_invalid_ports_fail_without_creating_files(self):
        with tempfile.TemporaryDirectory() as directory:
            root = Path(directory)
            with self.assertRaises(argparse.ArgumentTypeError):
                server.configure(root, 'saq.example.org', port=80)
            self.assertFalse((root / '.env').exists())


if __name__ == '__main__':
    unittest.main()
