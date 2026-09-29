from pathlib import Path

from pydantic_settings import BaseSettings, SettingsConfigDict

BASE_DIR = Path(__file__).resolve().parent.parent.parent


class Settings(BaseSettings):
    model_config = SettingsConfigDict(
        env_file=BASE_DIR / ".env",
        env_file_encoding="utf-8",
        extra="ignore",
    )

    app_name: str = "Backend CRM Mercadeo"
    api_prefix: str = "/api"

    secret_key: str = "cambia-esta-clave-en-produccion-liga-2026"
    algorithm: str = "HS256"
    access_token_expire_minutes: int = 480

    cors_origins: list[str] = [
        "http://localhost:3000",
        "http://127.0.0.1:3000",
        "http://localhost:5173",
        "http://127.0.0.1:5173",
        "http://localhost:5175",
        "http://127.0.0.1:5175",
        "http://160.2.1.80:3000",
        "http://160.2.1.80:5175",
    ]

    scse_db_user: str = ""
    scse_db_passwd: str = ""
    scse_db_ip: str = "localhost"
    scse_db_port: int = 1521
    scse_db_database: str = ""

    @property
    def database_url(self) -> str:
        return (
            f"oracle+oracledb://{self.scse_db_user}:{self.scse_db_passwd}"
            f"@{self.scse_db_ip}:{self.scse_db_port}/?service_name={self.scse_db_database}"
        )


settings = Settings()
