from pydantic_settings import BaseSettings
from typing import List

class Settings(BaseSettings):
    # Database
    DATABASE_URL: str = "postgresql+psycopg://codebase_user:codebase_password@postgres:5432/codebase_db"

    # Redis
    REDIS_URL: str = "redis://redis:6379/0"

    # Backend
    BACKEND_HOST: str = "0.0.0.0"
    BACKEND_PORT: int = 8000

    # CORS
    CORS_ORIGINS: List[str] = ["http://localhost:3000"]

    # AI/LLM
    ANTHROPIC_API_KEY: str = ""

    # AWS/S3
    AWS_ACCESS_KEY_ID: str = ""
    AWS_SECRET_ACCESS_KEY: str = ""
    S3_BUCKET_NAME: str = ""
    AWS_REGION: str = "us-east-1"

    class Config:
        env_file = "../.env"
        case_sensitive = True
        extra = "ignore"

settings = Settings()
