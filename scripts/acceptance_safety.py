"""Refuse recording acceptance checks against a public or ordinary local installation."""

import os
from urllib.parse import urlsplit


def require_isolated_origin(origin, environment=None):
    """Require an explicit disposable loopback origin; this does not replace DB/storage isolation."""
    environment = os.environ if environment is None else environment
    try:
        target = urlsplit(origin)
        port = target.port
    except (TypeError, ValueError):
        raise ValueError('Acceptance origin is invalid; value suppressed.') from None
    if (
        environment.get('SAQ_ISOLATED_ACCEPTANCE') != '1'
        or target.scheme != 'http'
        or target.hostname not in {'localhost', '127.0.0.1', '::1'}
        or port is None
        or port in {3000, 8000, 55432}
        or target.username
        or target.password
        or target.path not in {'', '/'}
        or target.query
        or target.fragment
    ):
        raise ValueError(
            'Acceptance requires SAQ_ISOLATED_ACCEPTANCE=1 and a disposable loopback HTTP origin '
            'on a separate port (for example 3090), with its own configuration, database and storage.'
        )
    return origin
