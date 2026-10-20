"""Regression checks for observation grouping and independent review boundaries."""

import unittest

from import_social_observations import (
    canonical_url,
    grouped_rows,
    statements,
    validate_location,
)


class SocialImportTests(unittest.TestCase):
    def test_same_source_groups_fragments_without_merging_projects(self):
        rows = [
            {
                'ID': 'A01',
                'ЖК': 'Altyn Uia 2',
                'Ссылка на доказательство': 'https://www.example.org/',
            },
            {
                'ID': 'A02',
                'ЖК': 'Altyn Uia 2',
                'Ссылка на доказательство': 'https://example.org',
            },
            {
                'ID': 'A03',
                'ЖК': 'Altyn Uia III',
                'Ссылка на доказательство': 'https://example.org',
            },
        ]
        groups = grouped_rows(rows)
        self.assertEqual(len(groups), 2)
        self.assertEqual([r['ID'] for r in next(iter(groups.values()))], ['A01', 'A02'])

    def test_invalid_urls_and_swapped_coordinates_are_rejected(self):
        for url in [
            'javascript:alert(1)',
            'https://user:password@example.org',
            'https://example.org/\n',
        ]:
            with self.assertRaises(ValueError):
                canonical_url(url)
        with self.assertRaises(ValueError):
            validate_location({'latitude': 82.6, 'longitude': 49.9})

    def test_observation_preserves_caveats_without_confirming_identity_or_risk(self):
        row = dict.fromkeys(
            [
                'Площадка',
                'Наблюдаемый фрагмент',
                'Основание/стадия',
                'В списке 15',
                'Тип материала',
                'Дата материала',
                'Приоритет',
                'Следующее действие',
                'Сигнал/интерпретация',
            ],
            'Не проверено',
        )
        row.update(
            {
                'ID': 'A01',
                'ЖК': 'Example',
                'Ссылка на доказательство': 'https://example.org',
                'Оговорка': 'Не подтверждает текущее нарушение',
            }
        )
        plan = {
            'captured_at': '2026-10-19T09:00:00Z',
            'locations': {},
            'projects': {
                'Example': {
                    'id': '00000000-0000-4000-8000-000000000001',
                    'existing': False,
                    'address': 'Не уточнён',
                },
            },
        }
        commands, assets = statements([row], plan, {'files': []})
        sql = '\n'.join(commands)
        self.assertIn('Не подтверждает текущее нарушение', assets[0][1].decode())
        self.assertIn("'UNKNOWN'", sql)
        self.assertIn('identity_confirmed', sql)
        for table in [
            'risk_factors',
            'legal_bases',
            'signals',
            'analysis_jobs',
            'property_matches',
        ]:
            self.assertNotIn(f'INSERT INTO {table}', sql)
        self.assertNotIn('DELETE FROM', sql)


if __name__ == '__main__':
    unittest.main()
