import os
from dataclasses import dataclass
from functools import lru_cache

from dotenv import load_dotenv

load_dotenv()


@dataclass(frozen=True)
class Settings:
    database_url: str
    supabase_url: str
    supabase_service_key: str
    jwt_secret: str
    jwt_algorithm: str
    jwt_expire_minutes: int
    pin_pepper: str
    admin_email: str
    cors_origins: list[str]
    demo_mode: bool


@lru_cache
def get_settings() -> Settings:
    return Settings(
        database_url=os.environ["DATABASE_URL"],
        supabase_url=os.environ["SUPABASE_URL"],
        supabase_service_key=os.environ["SUPABASE_SERVICE_KEY"],
        jwt_secret=os.environ["JWT_SECRET"],
        jwt_algorithm=os.getenv("JWT_ALGORITHM", "HS256"),
        jwt_expire_minutes=int(os.getenv("JWT_EXPIRE_MINUTES", "60")),
        pin_pepper=os.environ["PIN_PEPPER"],
        admin_email=os.environ["ADMIN_EMAIL"],
        cors_origins=[origin.strip() for origin in os.getenv("CORS_ORIGINS", "*").split(",")],
        demo_mode=os.getenv("DEMO_MODE", "false").lower() == "true",
    )
