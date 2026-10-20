import unittest

from acceptance_safety import require_isolated_origin


class AcceptanceSafetyTests(unittest.TestCase):
    def test_default_working_public_and_credential_urls_are_rejected(self):
        for origin in [
            'http://localhost:3000',
            'https://example.org',
            'http://example.org:3090',
            'http://user:password@localhost:3090',
            'http://localhost:3090/path',
            'http://localhost:invalid',
        ]:
            with self.subTest(origin=origin), self.assertRaises(ValueError):
                require_isolated_origin(origin, {'SAQ_ISOLATED_ACCEPTANCE': '1'})

    def test_acknowledgement_and_separate_port_are_required(self):
        with self.assertRaises(ValueError):
            require_isolated_origin('http://localhost:3090', {})
        for origin in ['http://localhost:3090', 'http://127.0.0.1:3090', 'http://[::1]:3090']:
            self.assertEqual(require_isolated_origin(origin, {'SAQ_ISOLATED_ACCEPTANCE': '1'}), origin)


if __name__ == '__main__':
    unittest.main()
