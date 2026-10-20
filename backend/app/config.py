from pathlib import Path

from pydantic import Field, SecretStr, model_validator
from pydantic_settings import BaseSettings, SettingsConfigDict

ROOT = Path(__file__).resolve().parents[2]


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=ROOT / '.env', extra='ignore', hide_input_in_errors=True)

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
    document_pdf_timeout_seconds: int = Field(default=12, ge=1, le=60)
    pdf_validation_timeout_seconds: int = Field(default=10, ge=1, le=10)
    pdf_max_pages: int = Field(default=100, ge=1, le=500)
    job_lease_seconds: int = Field(default=180, ge=120, le=600)
    job_max_attempts: int = Field(default=2, ge=1, le=3)
    worker_poll_seconds: float = Field(default=1, ge=0.1, le=10)
    url_schedule_poll_seconds: int = Field(default=30, ge=1, le=300)
    url_schedule_source_interval_seconds: int = Field(default=300, ge=60, le=86400)
    url_schedule_source_hourly_limit: int = Field(default=12, ge=1, le=100)
    threads_search_enabled: bool = False
    threads_access_token: SecretStr = Field(default=SecretStr(''), repr=False)
    # Keep the web search deadline below the existing frontend proxy's 15 seconds.
    threads_search_timeout_seconds: int = Field(default=10, ge=1, le=10)
    threads_search_interval_seconds: int = Field(default=30, ge=1, le=3600)
    telegram_enabled: bool = False
    telegram_bot_token: SecretStr = Field(default=SecretStr(''), repr=False)
    telegram_chat_id: str = Field(default='', pattern=r'^(?:[1-9]\d{0,19})?$', repr=False)
    telegram_include_demo: bool = False
    telegram_timeout_seconds: int = Field(default=10, ge=1, le=15)
    telegram_max_attempts: int = Field(default=3, ge=1, le=5)
    telegram_web_base_url: str = Field(default='', max_length=500)

    @model_validator(mode='after')
    def telegram_configuration(self):
        from app.telegram import valid_token, valid_web_base

        if self.telegram_enabled and (
            not valid_token(self.telegram_bot_token.get_secret_value()) or not self.telegram_chat_id
        ):
            raise ValueError('Telegram requires a bot token and a paired private chat')
        if self.telegram_web_base_url and not valid_web_base(self.telegram_web_base_url):
            raise ValueError('Telegram web link requires HTTPS without credentials, query or fragment')
        return self
