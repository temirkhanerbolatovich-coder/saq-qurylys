"""Behavior checks for backup integrity and preservation of source container state."""

import hashlib
import importlib.util
import json
import tempfile
import unittest
from pathlib import Path
from unittest.mock import patch

SPEC = importlib.util.spec_from_file_location('backup_local', Path(__file__).with_name('backup_local.py'))
backup = importlib.util.module_from_spec(SPEC)
SPEC.loader.exec_module(backup)


class BackupIntegrityTests(unittest.TestCase):
    def setUp(self):
        self.temporary = tempfile.TemporaryDirectory()
        self.addCleanup(self.temporary.cleanup)
        workspace = Path(self.temporary.name)
        root_patch = patch.object(backup, 'ROOT', workspace)
        root_patch.start()
        self.addCleanup(root_patch.stop)
        self.root = workspace / '.local' / 'backups' / 'fixture'
        self.root.mkdir(parents=True)
        self.content = 'DEMO. Исходный материал. Қазақша.'.encode()
        sha = hashlib.sha256(self.content).hexdigest()
        self.asset = {
            'id': 'demo',
            'storage_key': f'{sha[:2]}/{sha}.txt',
            'sha256': sha,
            'byte_size': len(self.content),
            'kind': 'TEXT',
        }
        self.storage = self.root / 'storage'
        self.original = self.storage / self.asset['storage_key']
        self.original.parent.mkdir(parents=True)
        self.original.write_bytes(self.content)
        (self.root / 'database.dump').write_bytes(b'PGDMP synthetic archive')
        tables = {
            name: {'rows': 0, 'sha256': hashlib.sha256(b'').hexdigest()}
            for name in ('assets', 'audit_events', 'signals', 'alembic_version')
        }
        tables['assets']['rows'] = 1
        self.manifest = {
            'schema_version': 1,
            'database_sha256': backup.digest(self.root / 'database.dump'),
            'tables': tables,
            'assets': [self.asset],
            'source_containers': {'api': {'image': 'sha256:' + 'a' * 64}},
        }
        self.save_manifest()

    def save_manifest(self):
        (self.root / 'manifest.json').write_text(json.dumps(self.manifest), encoding='utf-8')

    def test_valid_asset_bytes_and_manifest_are_accepted(self):
        self.assertEqual(backup.check_asset(self.storage, self.asset), self.original)
        self.assertEqual(backup.load_backup(self.root), self.manifest)

    def test_imported_html_original_is_included_and_hash_checked(self):
        content = '<html><p>Оригинал публикации. Қазақша.</p></html>'.encode()
        sha = hashlib.sha256(content).hexdigest()
        asset = self.asset | {
            'storage_key': f'{sha[:2]}/{sha}.html',
            'sha256': sha,
            'byte_size': len(content),
            'kind': 'HTML',
        }
        original = self.storage / asset['storage_key']
        original.parent.mkdir(parents=True, exist_ok=True)
        original.write_bytes(content)
        self.manifest['assets'] = [asset]
        self.save_manifest()

        self.assertEqual(backup.check_asset(self.storage, asset), original)
        self.assertEqual(backup.load_backup(self.root)['assets'], [asset])
        original.write_bytes(b'x' * len(content))
        with self.assertRaisesRegex(ValueError, 'modified'):
            backup.load_backup(self.root)

    def test_traversal_absolute_path_and_digest_prefix_are_rejected(self):
        for key in (
            '../outside.txt',
            '/outside.txt',
            r'C:\outside.txt',
            '00/' + 'a' * 64 + '.txt',
            self.asset['storage_key'].removesuffix('.txt') + '.exe',
            self.asset['storage_key'].removesuffix('.txt') + '.html.exe',
        ):
            with self.subTest(key=key), self.assertRaises(ValueError):
                backup.asset_path(self.storage, self.asset | {'storage_key': key})

    def test_changed_asset_bytes_are_rejected_even_when_size_matches(self):
        self.original.write_bytes(b'x' * len(self.content))
        with self.assertRaisesRegex(ValueError, 'modified'):
            backup.load_backup(self.root)

    def test_asset_size_mismatch_is_rejected(self):
        with self.assertRaisesRegex(ValueError, 'wrong size'):
            backup.check_asset(self.storage, self.asset | {'byte_size': len(self.content) + 1})

    def test_asset_symlink_is_rejected(self):
        alternate = self.root / 'alternate.txt'
        alternate.write_bytes(self.content)
        self.original.unlink()
        try:
            self.original.symlink_to(alternate)
        except OSError:
            self.skipTest('Creating symlinks requires additional Windows privileges')
        with self.assertRaisesRegex(ValueError, 'symlink'):
            backup.check_asset(self.storage, self.asset)

    def test_corrupt_dump_fails_before_any_docker_operation(self):
        (self.root / 'database.dump').write_bytes(b'PGDMP changed archive')
        with (
            patch.object(backup, 'run') as run,
            self.assertRaisesRegex(ValueError, 'checksum'),
        ):
            backup.verify_backup(self.root)
        run.assert_not_called()

    def test_wrong_dump_format_is_rejected_even_with_matching_hash(self):
        (self.root / 'database.dump').write_bytes(b'not a custom archive')
        self.manifest['database_sha256'] = backup.digest(self.root / 'database.dump')
        self.save_manifest()
        with self.assertRaisesRegex(ValueError, 'custom-format'):
            backup.load_backup(self.root)

    def test_missing_history_fingerprints_are_rejected(self):
        del self.manifest['tables']['audit_events']
        self.save_manifest()
        with self.assertRaisesRegex(ValueError, 'fingerprints'):
            backup.load_backup(self.root)

    def test_asset_count_mismatch_is_rejected(self):
        self.manifest['tables']['assets']['rows'] = 2
        self.save_manifest()
        with self.assertRaisesRegex(ValueError, 'count'):
            backup.load_backup(self.root)

    def test_mutable_api_image_tag_is_rejected(self):
        self.manifest['source_containers']['api']['image'] = 'saq:latest'
        self.save_manifest()
        with self.assertRaisesRegex(ValueError, 'Immutable'):
            backup.load_backup(self.root)

    def test_malformed_manifest_types_fail_before_docker(self):
        malformed = [[], self.manifest | {'database_sha256': 42}, self.manifest | {'assets': [None]}]
        for manifest in malformed:
            with self.subTest(manifest=manifest):
                (self.root / 'manifest.json').write_text(json.dumps(manifest), encoding='utf-8')
                with patch.object(backup, 'run') as run, self.assertRaises(ValueError):
                    backup.verify_backup(self.root)
                run.assert_not_called()


class SourceStateTests(unittest.TestCase):
    @staticmethod
    def states(api_running=True, api_paused=False, worker_running=True, worker_paused=False):
        return {
            'api': {'id': 'api', 'running': api_running, 'paused': api_paused},
            'worker': {
                'id': 'worker',
                'running': worker_running,
                'paused': worker_paused,
            },
        }

    def test_source_writers_resume_after_backup_error(self):
        calls = []
        with patch.object(backup, 'run', side_effect=lambda command, **_: calls.append(command)):
            with self.assertRaisesRegex(ValueError, 'copy failed'):
                with backup.quiesced(self.states()):
                    raise ValueError('copy failed')
        self.assertEqual(
            calls,
            [
                ['docker', 'pause', 'api'],
                ['docker', 'pause', 'worker'],
                ['docker', 'unpause', 'worker'],
                ['docker', 'unpause', 'api'],
            ],
        )

    def test_previously_paused_or_stopped_services_are_preserved(self):
        with patch.object(backup, 'run') as run:
            with backup.quiesced(self.states(api_paused=True, worker_running=False)):
                pass
        run.assert_not_called()

    def test_first_writer_resumes_when_pausing_second_writer_fails(self):
        calls = []

        def run(command, **kwargs):
            calls.append(command)
            if command == ['docker', 'pause', 'worker']:
                raise RuntimeError('pause failed')

        with (
            patch.object(backup, 'run', side_effect=run),
            self.assertRaisesRegex(RuntimeError, 'pause failed'),
        ):
            with backup.quiesced(self.states()):
                pass
        self.assertEqual(calls[-1], ['docker', 'unpause', 'api'])

    def test_all_resumptions_are_attempted_if_one_resume_fails(self):
        calls = []

        def run(command, **kwargs):
            calls.append(command)
            if command == ['docker', 'unpause', 'worker']:
                raise RuntimeError('resume failed')

        with (
            patch.object(backup, 'run', side_effect=run),
            self.assertRaisesRegex(RuntimeError, 'resume'),
        ):
            with backup.quiesced(self.states()):
                pass
        self.assertEqual(calls[-1], ['docker', 'unpause', 'api'])


if __name__ == '__main__':
    unittest.main()
