from pathlib import Path

from pydantic import Field
from pydantic_settings import BaseSettings, SettingsConfigDict

ROOT = Path(__file__).resolve().parents[2]


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=ROOT / '.env', extra='ignore')

    database_url: str = Field(pattern=r'^postgresql\+psycopg://')
    session_secret: str = Field(min_length=32)
    app_origin: str = 'http://localhost:3000'
    storage_root: Path = ROOT / 'storage'
    session_cookie_secure: bool = False
    bootstrap_analyst_username: str = 'analyst'
    bootstrap_analyst_password: str = Field(min_length=12)
