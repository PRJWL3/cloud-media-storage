from typing import List, Union
from pydantic_settings import BaseSettings, SettingsConfigDict
from pydantic import AnyHttpUrl, BeforeValidator
from typing_extensions import Annotated

def any_http_url_to_str(v: Union[str, List[str]]) -> List[str]:
    if isinstance(v, str) and not v.startswith("["):
        return [i.strip() for i in v.split(",")]
    elif isinstance(v, list):
        return v
    raise ValueError(v)

class Settings(BaseSettings):
    API_V1_STR: str = "/api/v1"
    PROJECT_NAME: str = "Cloud Media Storage"
    
    # CORS
    BACKEND_CORS_ORIGINS: Annotated[
        List[AnyHttpUrl], BeforeValidator(any_http_url_to_str)
    ] = []

    DATABASE_URL: str = "sqlite:///./sql_app.db"
    JWT_SECRET: str = "SECRET_KEY_PLACEHOLDER"
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 30

    model_config = SettingsConfigDict(case_sensitive=True, env_file=".env")

settings = Settings()
