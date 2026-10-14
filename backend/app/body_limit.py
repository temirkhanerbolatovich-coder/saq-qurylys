from fastapi import Request

from app.dependencies import error_response


class BodyLimitMiddleware:
    """Bound streamed bodies before multipart/JSON parsing, including chunked requests."""

    def __init__(self, app, upload_limit: int):
        self.app = app
        self.upload_limit = upload_limit

    async def __call__(self, scope, receive, send):
        if scope['type'] != 'http' or scope['method'] not in {'POST', 'PUT', 'PATCH'}:
            return await self.app(scope, receive, send)
        limit = (
            self.upload_limit + 65_536
            if scope['path'] in {'/api/v1/advertisements/upload', '/api/v1/assets/upload'}
            else 500_000
        )
        request = Request(scope)
        try:
            declared = int(request.headers.get('content-length', '0'))
            if declared < 0:
                raise ValueError('negative length')
        except ValueError:
            return await error_response(request, 400, 'Некорректная длина запроса')(scope, receive, send)
        if declared > limit:
            return await error_response(request, 413, 'Слишком большой запрос')(scope, receive, send)
        chunks, size = [], 0
        while True:
            message = await receive()
            if message['type'] == 'http.disconnect':
                return
            chunk = message.get('body', b'')
            size += len(chunk)
            if size > limit:
                return await error_response(request, 413, 'Слишком большой запрос')(scope, receive, send)
            chunks.append(chunk)
            if not message.get('more_body', False):
                break
        body = b''.join(chunks)
        delivered = False

        async def replay():
            nonlocal delivered
            if delivered:
                return await receive()
            delivered = True
            return {'type': 'http.request', 'body': body, 'more_body': False}

        await self.app(scope, replay, send)
