import hmac
from typing import Annotated
from uuid import UUID, uuid4

from fastapi import Depends, Header, Request
from fastapi.responses import JSONResponse
from sqlalchemy.orm import Session
from starlette.exceptions import HTTPException

from app.models import LoginSession, Property, User, utcnow
from app.security import token_hash, valid_csrf


def get_db(request: Request):
    with request.app.state.sessions() as db:
        yield db


DB = Annotated[Session, Depends(get_db)]


def current_user(request: Request, db: DB) -> User:
    token = request.cookies.get('saq_session', '')
    session = db.get(LoginSession, token_hash(token)) if token else None
    if not session or session.expires_at <= utcnow():
        raise HTTPException(401, 'Войдите в рабочее место аналитика')
    return session.user


Actor = Annotated[User, Depends(current_user)]


def check_csrf(request: Request, x_csrf_token: Annotated[str, Header(min_length=32)]):
    settings = request.app.state.settings
    if request.headers.get('origin') != settings.app_origin:
        raise HTTPException(403, 'Недопустимый источник запроса')
    cookie = request.cookies.get('saq_csrf', '')
    if not hmac.compare_digest(cookie, x_csrf_token) or not valid_csrf(
        x_csrf_token, settings.session_secret, request.cookies.get('saq_session', '')
    ):
        raise HTTPException(403, 'Обновите защитный токен и повторите действие')


def get_property(db: Session, property_id: UUID) -> Property:
    row = db.get(Property, property_id)
    if not row:
        raise HTTPException(404, 'Объект не найден')
    return row


def error_response(request: Request, status: int, message: str, fields=None):
    return JSONResponse(
        status_code=status,
        content={
            'error': {
                'code': f'HTTP_{status}',
                'message': message,
                'request_id': str(getattr(request.state, 'request_id', uuid4())),
                'fields': fields or [],
            }
        },
    )
