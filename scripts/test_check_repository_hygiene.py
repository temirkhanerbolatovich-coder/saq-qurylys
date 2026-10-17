import unittest

from check_repository_hygiene import prohibited_paths


class RepositoryHygieneTests(unittest.TestCase):
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
