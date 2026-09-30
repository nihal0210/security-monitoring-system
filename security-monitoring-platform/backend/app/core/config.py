import os
from typing import List
from pydantic_settings import BaseSettings, SettingsConfigDict

class Settings(BaseSettings):
    model_config = SettingsConfigDict(
        extra="ignore",
        env_file=".env",
        case_sensitive=False
    )

    PROJECT_NAME: str = "Real-Time Server Monitoring and Temporal User Activity Visualization System"
    PROJECT_VERSION: str = "1.0.0"
    API_V1_STR: str = "/api"
    
    # Primary Database: PostgreSQL (with fallback to SQLite if unreachable)
    DATABASE_URL: str = os.getenv(
        "DATABASE_URL",
        "postgresql://postgres:postgres@localhost:5432/security_monitoring"
    )
    SQLITE_FALLBACK_URL: str = "sqlite:///./monitoring_platform.db"
    
    # CORS Origins
    CORS_ORIGINS: List[str] = [
        "http://localhost:5173",
        "http://localhost:3000",
        "http://127.0.0.1:5173",
        "http://127.0.0.1:3000",
        "*"
    ]
    
    # Server Host & Port
    HOST: str = "0.0.0.0"
    PORT: int = 8000
    FASTAPI_PORT: int = 8000

settings = Settings()
