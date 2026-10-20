"""Local setup preserves existing secrets and supports an empty isolated installation."""

import argparse
import importlib.util
import os
import tempfile
import unittest
from concurrent.futures import ThreadPoolExecutor
from pathlib import Path
from unittest.mock import patch

SPEC = importlib.util.spec_from_file_location('configure_local', Path(__file__).with_name('configure_local.py'))
configure_local = importlib.util.module_from_spec(SPEC)
SPEC.loader.exec_module(configure_local)


class LocalConfigurationTests(unittest.TestCase):
    def setUp(self):
        temporary = tempfile.TemporaryDirectory()
        self.addCleanup(temporary.cleanup)
        self.root = Path(temporary.name)

    def files(self):
        return {str(path.relative_to(self.root)): path.read_bytes() for path in self.root.rglob('*') if path.is_file()}

    def test_fresh_default_configuration_is_consistent_and_private(self):
        configure_local.configure(self.root)
        values = dict(line.split('=', 1) for line in (self.root / '.env').read_text().splitlines())
        credentials = (self.root / '.local/credentials.txt').read_text()
        self.assertEqual(values['APP_ORIGIN'], 'http://localhost:3000')
        self.assertEqual(values['APP_PORT'], '3000')
        self.assertEqual(values['DEMO_SEED_ENABLED'], 'true')
        self.assertIn(values['BOOTSTRAP_ANALYST_PASSWORD'], credentials)
        self.assertGreaterEqual(len(values['BOOTSTRAP_ANALYST_PASSWORD']), 12)
        self.assertIn(values['POSTGRES_PASSWORD'], values['DATABASE_URL'])
        self.assertNotEqual(values['POSTGRES_PASSWORD'], values['SESSION_SECRET'])
        for key in ('THREADS_SEARCH_ENABLED', 'TELEGRAM_ENABLED', 'COLLECTOR_ENABLED', 'LLM_ENABLED'):
            self.assertEqual(values[key], 'false')
        if os.name == 'posix':
            for path in (self.root / '.env', self.root / '.local/credentials.txt'):
                self.assertEqual(path.stat().st_mode & 0o777, 0o600)

    def test_explicit_empty_installation_and_alternate_port(self):
        configure_local.configure(self.root, port=3090, demo_seed=False)
        content = (self.root / '.env').read_text()
        self.assertIn('APP_PORT=3090\n', content)
        self.assertIn('APP_ORIGIN=http://localhost:3090\n', content)
        self.assertIn('DEMO_SEED_ENABLED=false\n', content)
        self.assertIn('http://localhost:3090', (self.root / '.local/credentials.txt').read_text())

    def test_repeated_generation_does_not_change_existing_files(self):
        configure_local.configure(self.root)
        before = self.files()
        with self.assertRaises(FileExistsError):
            configure_local.configure(self.root, port=3090, demo_seed=False)
        self.assertEqual(self.files(), before)

    def test_existing_credentials_alone_are_preserved(self):
        private = self.root / '.local'
        private.mkdir()
        (private / 'credentials.txt').write_text('retained private credentials')
        before = self.files()
        with self.assertRaises(FileExistsError):
            configure_local.configure(self.root)
        self.assertEqual(self.files(), before)
        self.assertFalse((self.root / '.env').exists())

    def test_existing_environment_alone_is_preserved(self):
        (self.root / '.env').write_text('retained configuration')
        before = self.files()
        with self.assertRaises(FileExistsError):
            configure_local.configure(self.root)
        self.assertEqual(self.files(), before)

    def test_partial_failure_retains_generated_environment(self):
        original_write = configure_local.write_private

        def fail_credentials(path, content):
            if path.name == 'credentials.txt':
                raise OSError('simulated write failure')
            original_write(path, content)

        with patch.object(configure_local, 'write_private', side_effect=fail_credentials):
            with self.assertRaises(OSError):
                configure_local.configure(self.root)
        before = self.files()
        self.assertIn('.env', before)
        with self.assertRaises(FileExistsError):
            configure_local.configure(self.root)
        self.assertEqual(self.files(), before)

    def test_concurrent_generation_has_one_winner_without_mixed_secrets(self):
        def generate(_):
            try:
                configure_local.configure(self.root)
                return 'created'
            except FileExistsError:
                return 'preserved'

        with ThreadPoolExecutor(max_workers=2) as pool:
            self.assertCountEqual(list(pool.map(generate, range(2))), ['created', 'preserved'])
        values = dict(line.split('=', 1) for line in (self.root / '.env').read_text().splitlines())
        self.assertIn(values['BOOTSTRAP_ANALYST_PASSWORD'], (self.root / '.local/credentials.txt').read_text())

    def test_invalid_port_fails_before_writing(self):
        for port in (0, 1023, 65536, True, '3090'):
            with self.subTest(port=port), self.assertRaises(ValueError):
                configure_local.configure(self.root, port=port)
        self.assertEqual(self.files(), {})

    def test_cli_port_validation(self):
        for value in ('1024', '3090', '65535'):
            self.assertEqual(configure_local.local_port(value), int(value))
        for value in ('0', '-1', '65536', '3090x', 'localhost:3000'):
            with self.subTest(value=value), self.assertRaises(argparse.ArgumentTypeError):
                configure_local.local_port(value)


if __name__ == '__main__':
    unittest.main()
