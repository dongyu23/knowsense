from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    # PostgreSQL
    db_host: str = "localhost"
    db_port: int = 15432
    db_name: str = "knowsense"
    db_user: str = "knowsense"
    db_password: str = "knowsense_dev"

    @property
    def database_url(self) -> str:
        return f"postgresql+asyncpg://{self.db_user}:{self.db_password}@{self.db_host}:{self.db_port}/{self.db_name}"

    # Redis
    redis_url: str = "redis://localhost:16379/0"

    # MinIO
    minio_endpoint: str = "localhost:19000"
    minio_access_key: str = "minioadmin"
    minio_secret_key: str = "minioadmin_dev"
    minio_bucket: str = "knowsense-manuals"
    minio_secure: bool = False

    # LLM
    llm_api_url: str = ""
    llm_api_key: str = ""
    llm_model: str = ""

    # Embedding
    embedding_api_url: str = ""
    embedding_api_key: str = ""
    embedding_model: str = ""

    # PaddleOCR
    paddleocr_api_url: str = ""
    paddleocr_api_key: str = ""

    # JWT
    jwt_secret: str = "change-me-in-production"
    jwt_algorithm: str = "HS256"
    jwt_expire_minutes: int = 10080  # 7 days

    # App
    app_debug: bool = True

    model_config = {"env_file": ".env", "env_file_encoding": "utf-8"}


settings = Settings()
