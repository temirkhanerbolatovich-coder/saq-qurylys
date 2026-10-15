from pathlib import Path

from pydantic import Field
from pydantic_settings import BaseSettings, SettingsConfigDict

ROOT = Path(__file__).resolve().parents[2]


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=ROOT / '.env', extra='ignore')

    database_url: str = Field(pattern=r'^postgresql\+psycopg://', repr=False)
    session_secret: str = Field(min_length=32, repr=False)
    app_origin: str = 'http://localhost:3000'
    storage_root: Path = ROOT / 'storage'
    session_cookie_secure: bool = False
    bootstrap_analyst_username: str = 'analyst'
    bootstrap_analyst_password: str = Field(min_length=12, repr=False)
    max_upload_bytes: int = Field(default=10_485_760, ge=1024, le=20_971_520)
    max_image_pixels: int = Field(default=25_000_000, ge=1000, le=50_000_000)
    tesseract_command: str = 'tesseract'
    ocr_languages: str = Field(default='rus+kaz+eng', pattern=r'^[a-z+]+$')
    ocr_timeout_seconds: int = Field(default=60, ge=1, le=90)
    pdf_timeout_seconds: int = Field(default=60, ge=1, le=90)
    pdf_validation_timeout_seconds: int = Field(default=10, ge=1, le=10)
    pdf_max_pages: int = Field(default=100, ge=1, le=500)
    job_lease_seconds: int = Field(default=180, ge=120, le=600)
    job_max_attempts: int = Field(default=2, ge=1, le=3)
    worker_poll_seconds: float = Field(default=1, ge=0.1, le=10)
