import os
import pytest
from pydantic import ValidationError
from app.core.config import Settings, get_settings

def test_settings_default_values():
    settings = Settings(
        DATABASE_URL="postgresql+asyncpg://postgres:postgres@localhost:5432/test_db",
        _env_file=None
    )
    assert settings.DATABASE_URL == "postgresql+asyncpg://postgres:postgres@localhost:5432/test_db"
    assert settings.SQL_ECHO is False
    assert settings.APP_PORT == 8000

def test_settings_custom_values():
    settings = Settings(
        DATABASE_URL="postgresql+asyncpg://user:pass@localhost:5432/custom_db",
        SQL_ECHO=True,
        APP_PORT=9000,
        _env_file=None
    )
    assert settings.SQL_ECHO is True
    assert settings.APP_PORT == 9000

def test_settings_cached_singleton():
    s1 = get_settings()
    s2 = get_settings()
    assert s1 is s2


def test_database_url_obligatoria_sin_default(monkeypatch):
    monkeypatch.delenv("DATABASE_URL", raising=False)
    with pytest.raises(ValidationError):
        Settings(_env_file=None)


def test_database_url_se_lee_del_entorno(monkeypatch):
    monkeypatch.setenv("DATABASE_URL", "postgresql+asyncpg://u:p@db:5432/x")
    assert Settings(_env_file=None).DATABASE_URL == "postgresql+asyncpg://u:p@db:5432/x"


def test_cors_origins_default_permite_cualquier_origen(monkeypatch):
    monkeypatch.setenv("DATABASE_URL", "postgresql+asyncpg://u:p@db:5432/x")
    monkeypatch.delenv("CORS_ORIGINS", raising=False)
    settings = Settings(_env_file=None)
    assert settings.CORS_ORIGINS == "*"
    assert settings.cors_origins_list == ["*"]


def test_cors_origins_lista_separada_por_comas(monkeypatch):
    monkeypatch.setenv("DATABASE_URL", "postgresql+asyncpg://u:p@db:5432/x")
    monkeypatch.setenv("CORS_ORIGINS", "http://elgrupo3.tech:8002, http://localhost:8080")
    settings = Settings(_env_file=None)
    assert settings.cors_origins_list == [
        "http://elgrupo3.tech:8002",
        "http://localhost:8080",
    ]
