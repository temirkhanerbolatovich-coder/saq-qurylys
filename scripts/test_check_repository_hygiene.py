import subprocess
import tempfile
import unittest
from pathlib import Path

from check_repository_hygiene import (
    index_contents,
    inspect_files,
    missing_markdown_targets,
    prohibited_paths,
    secret_findings,
)


class RepositoryHygieneTests(unittest.TestCase):
    def test_staged_secret_is_detected_even_after_working_file_is_redacted(self):
        with tempfile.TemporaryDirectory() as directory:
            root = Path(directory)
            subprocess.run(['git', 'init', '-q'], cwd=root, check=True, capture_output=True)
            path = root / 'deploy.ps1'
            path.write_text('ghp_' + 'a' * 36, encoding='utf-8')
            subprocess.run(['git', 'add', 'deploy.ps1'], cwd=root, check=True, capture_output=True)
            path.write_text('redacted working copy', encoding='utf-8')
            self.assertEqual(inspect_files(root, ['deploy.ps1']), [])
            problems = inspect_files(root, ['deploy.ps1'], index_contents(root))
            self.assertEqual(len(problems), 1)
            self.assertIn('value suppressed', problems[0])

    def test_caches_dumps_and_browser_outputs_are_rejected(self):
        paths = ['backend/__pycache__/a.pyc', 'db.dump', 'frontend/test-results/result.json']
        self.assertEqual(prohibited_paths(paths), sorted(paths))

    def test_secret_diagnostics_never_contain_the_matched_value(self):
        value = 'ghp_' + 'a' * 36
        findings = secret_findings('header\n' + value)
        self.assertEqual(findings, [('GitHub credential', 2)])
        self.assertNotIn(value, str(findings))

    def test_local_links_and_json_fail_without_echoing_file_contents(self):
        with tempfile.TemporaryDirectory() as directory:
            root = Path(directory)
            (root / 'README.md').write_text('[missing](absent.md)\n[web](https://example.org)', encoding='utf-8')
            (root / 'bad.json').write_text('{private invalid payload', encoding='utf-8')
            self.assertEqual(missing_markdown_targets(root, 'README.md', '[ok](README.md#anchor)'), [])
            problems = inspect_files(root, ['README.md', 'bad.json'])
            self.assertEqual(len(problems), 2)
            self.assertNotIn('private invalid payload', str(problems))

    def test_secret_signatures_are_checked_in_keyfiles_and_powershell(self):
        with tempfile.TemporaryDirectory() as directory:
            root = Path(directory)
            (root / 'deploy.pem').write_text('-----BEGIN ' + 'PRIVATE KEY-----', encoding='utf-8')
            (root / 'deploy.ps1').write_text('ghp_' + 'a' * 36, encoding='utf-8')
            self.assertEqual(len(inspect_files(root, ['deploy.pem', 'deploy.ps1'])), 2)

    def test_existing_but_unversioned_link_target_is_rejected(self):
        with tempfile.TemporaryDirectory() as directory:
            root = Path(directory)
            (root / 'README.md').write_text('[guide](untracked.md)', encoding='utf-8')
            (root / 'untracked.md').write_text('not committed', encoding='utf-8')
            self.assertEqual(len(inspect_files(root, ['README.md'])), 1)
            self.assertEqual(inspect_files(root, ['README.md', 'untracked.md']), [])

    def test_private_files_are_rejected_in_any_subdirectory(self):
        paths = [
            '.env',
            'frontend/.env.local',
            '.local/credentials.txt',
            'nested/storage/file.txt',
            'output/report.pdf',
        ]
        self.assertEqual(prohibited_paths(paths), sorted(paths))

    def test_archives_are_rejected_without_opening_their_secret_contents(self):
        paths = ['saq-qurylys-main (2).zip', 'incoming/source.ZIP', 'backup.tar.gz']
        self.assertEqual(prohibited_paths(paths), sorted(paths))

    def test_flattened_frontend_cannot_change_project_root(self):
        paths = ['package-lock.json', 'workspace.tsx', 'design-system.css', 'next.config.ts']
        self.assertEqual(prohibited_paths(paths), sorted(paths))

    def test_documented_examples_and_correct_source_paths_remain_allowed(self):
        self.assertEqual(
            prohibited_paths(
                [
                    '.env.example',
                    'frontend/package-lock.json',
                    'frontend/components/workspace.tsx',
                    'frontend/app/design-system.css',
                    'docs/OCR_EVALUATION.md',
                    'data/evaluation/ru-kz-fields-v2.json',
                ]
            ),
            [],
        )


if __name__ == '__main__':
    unittest.main()
