import logging
import secrets
from collections import defaultdict, deque
from contextlib import asynccontextmanager
from uuid import uuid4

from fastapi import FastAPI, Request
from fastapi.exceptions import RequestValidationError
from sqlalchemy import create_engine, text
from sqlalchemy.orm import sessionmaker
from starlette.exceptions import HTTPException

from app.api import (
    advertisements,
    analysis,
    auth,
    legal_bases,
    monitoring,
    open_registry,
    properties,
    reviews,
    signal_pdf,
    signals,
    threads,
    url_import,
)
from app.body_limit import BodyLimitMiddleware
from app.config import Settings
from app.dependencies import DB, error_response
from app.security import hash_password

logger = logging.getLogger(__name__)


def create_app(settings: Settings | None = None) -> FastAPI:
    settings = settings or Settings()
    engine = create_engine(settings.database_url, pool_pre_ping=True, hide_parameters=True)

    @asynccontextmanager
    async def lifespan(_app):
        yield
        engine.dispose()

    app = FastAPI(title='SAQ QURYLYS', version='0.1.0', lifespan=lifespan)
    app.state.settings = settings
    app.state.engine = engine
    app.state.sessions = sessionmaker(engine, expire_on_commit=False)
    app.state.login_attempts = defaultdict(deque)
    app.state.threads_search_gate = threads.SearchGate()
    app.state.dummy_password = hash_password(secrets.token_urlsafe(24))
    app.add_middleware(BodyLimitMiddleware, upload_limit=settings.max_upload_bytes)

    @app.middleware('http')
    async def request_context(request: Request, call_next):
        request.state.request_id = uuid4()
        try:
            response = await call_next(request)
        except Exception:
            logger.exception('Request failed; request_id=%s', request.state.request_id)
            response = error_response(request, 500, 'Не удалось выполнить действие. Повторите позже.')
        response.headers['X-Request-ID'] = str(request.state.request_id)
        response.headers['Cache-Control'] = 'no-store'
        response.headers['X-Content-Type-Options'] = 'nosniff'
        return response

    @app.exception_handler(HTTPException)
    async def http_error(request, exc):
        return error_response(request, exc.status_code, str(exc.detail))

    @app.exception_handler(RequestValidationError)
    async def validation_error(request, exc):
        # Do not echo input values: validation can fail on credentials and private text.
        fields = [{'path': '.'.join(map(str, err['loc'])), 'message': err['msg']} for err in exc.errors()]
        return error_response(request, 422, 'Проверьте заполненные поля', fields)

    @app.get('/health', include_in_schema=False)
    def health(db: DB):
        db.execute(text('SELECT 1'))
        return {'status': 'ok'}

    app.include_router(auth.router)
    app.include_router(properties.router)
    app.include_router(advertisements.router)
    app.include_router(analysis.router)
    app.include_router(reviews.router)
    app.include_router(legal_bases.router)
    app.include_router(signals.router)
    app.include_router(signal_pdf.router)
    app.include_router(monitoring.router)
    app.include_router(threads.router)
    app.include_router(url_import.router)
    app.include_router(open_registry.router)
    return app


app = create_app()
