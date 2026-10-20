"""Boundary tests for the offline data replacement, without a live database."""

import unittest

from replace_demo_data import delete_plan, import_rows, literal


class ReplacementTests(unittest.TestCase):
    def test_external_text_cannot_terminate_sql_literal(self):
        self.assertEqual(literal("x'; DELETE FROM users;--"), "'x''; DELETE FROM users;--'")

    def test_real_dependents_abort_and_children_are_deleted_first(self):
        columns = {
            'properties': {'id', 'is_demo'},
            'assets': {'id', 'is_demo'},
            'users': {'id'},
            'commands': {'id'},
            'audit_events': {'id'},
        }
        sql = '\n'.join(
            delete_plan(
                columns,
                [{'child': 'assets', 'parent': 'properties', 'col': 'property_id'}],
            )
        )
        self.assertIn('REAL record depends on DEMO: assets', sql)
        self.assertLess(sql.index('DELETE FROM assets'), sql.index('DELETE FROM properties'))

    def test_research_observation_does_not_confirm_identity_or_risk(self):
        row = {
            'ID': 'A01',
            'ЖК': 'Example',
            'Адрес': 'Не установлен',
            'Прямой URL': 'https://example.org',
            'Вывод': 'Не доказано текущее нарушение',
        }
        commands, files = import_rows([row], {'files': []}, '2026-10-19T07:00:00+00:00')
        sql = '\n'.join(commands)
        self.assertIn("'UNKNOWN'", sql)
        self.assertIn('confirmed_property_id', sql)
        self.assertNotIn('INSERT INTO risk_factors', sql)
        self.assertNotIn('INSERT INTO evidence', sql)
        self.assertNotIn('INSERT INTO analysis_jobs', sql)
        self.assertIn('Не доказано текущее нарушение', files[0][1].decode())
        self.assertIn('оригинал интернет-страницы не получен', files[0][1].decode())


if __name__ == '__main__':
    unittest.main()
