import secrets
import time
from datetime import timedelta

from fastapi import APIRouter, Depends, Request, Response
from sqlalchemy import select
from starlette.exceptions import HTTPException

from app import dto
from app.dependencies import DB, Actor, check_csrf
from app.models import LoginSession, User, utcnow
from app.security import issue_csrf, token_hash, verify_password

router = APIRouter()


@router.get('/api/v1/auth/csrf', response_model=dto.CsrfToken, operation_id='getCsrf')
def csrf(request: Request, response: Response):
    settings = request.app.state.settings
    token = issue_csrf(settings.session_secret, request.cookies.get('saq_session', ''))
    response.set_cookie(
        'saq_csrf', token, httponly=True, secure=settings.session_cookie_secure, samesite='strict', max_age=3600
    )
    return {'csrf_token': token}


@router.post('/api/v1/auth/login', response_model=dto.UserOut, operation_id='login', dependencies=[Depends(check_csrf)])
def login(body: dto.LoginRequest, request: Request, response: Response, db: DB):
    settings = request.app.state.settings
    attempts = request.app.state.login_attempts[request.client.host if request.client else 'local']
    now = time.monotonic()
    while attempts and now - attempts[0] > 60:
        attempts.popleft()
    if len(attempts) >= 5:
        raise HTTPException(429, 'Слишком много попыток входа. Подождите минуту.')
    user = db.scalar(select(User).where(User.username == body.username))
    correct = verify_password(body.password, user.password_hash if user else request.app.state.dummy_password)
    if not user or not correct:
        attempts.append(now)
        raise HTTPException(401, 'Неверный логин или пароль')
    old = db.get(LoginSession, token_hash(request.cookies.get('saq_session', '')))
    if old:
        db.delete(old)
    token = secrets.token_urlsafe(32)
    db.add(LoginSession(token_hash=token_hash(token), user_id=user.id, expires_at=utcnow() + timedelta(hours=8)))
    db.commit()
    response.set_cookie(
        'saq_session',
        token,
        httponly=True,
        secure=settings.session_cookie_secure,
        samesite='strict',
        max_age=8 * 3600,
    )
    return user


@router.get('/api/v1/auth/me', response_model=dto.UserOut, operation_id='getCurrentUser')
def me(actor: Actor):
    return actor


@router.post('/api/v1/auth/logout', status_code=204, operation_id='logout', dependencies=[Depends(check_csrf)])
def logout(request: Request, response: Response, actor: Actor, db: DB):
    db.delete(db.get(LoginSession, token_hash(request.cookies['saq_session'])))
    db.commit()
    response.delete_cookie('saq_session')
    response.delete_cookie('saq_csrf')
