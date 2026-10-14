FROM python:3.12-slim-bookworm
WORKDIR /app/backend
COPY backend/requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt
COPY backend/ .
COPY data/seed/ /app/data/seed/
ENV PYTHONUNBUFFERED=1
RUN useradd --create-home saq && mkdir -p /app/storage && chown saq:saq /app/storage
USER saq
EXPOSE 8000
