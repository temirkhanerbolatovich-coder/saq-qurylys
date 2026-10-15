FROM python:3.12-slim-bookworm AS runtime-deps
RUN apt-get update && apt-get install -y --no-install-recommends \
    tesseract-ocr tesseract-ocr-rus tesseract-ocr-kaz tesseract-ocr-eng fonts-dejavu-core \
    libpango-1.0-0 libpangoft2-1.0-0 libharfbuzz-subset0 \
    && rm -rf /var/lib/apt/lists/*
WORKDIR /app/backend
COPY backend/requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

FROM runtime-deps AS runtime
COPY backend/ .
COPY data/seed/ /app/data/seed/
ENV PYTHONUNBUFFERED=1
RUN useradd --create-home saq && mkdir -p /app/storage && chown saq:saq /app/storage
USER saq
EXPOSE 8000
