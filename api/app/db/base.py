import os

from sqlalchemy import create_engine
from sqlalchemy.orm import declarative_base, sessionmaker

from app.config.settings import get_settings

settings = get_settings()

# Each Lambda execution environment holds its own engine/pool for its lifetime, and the
# DATABASE_URL already points at Supabase's pgbouncer pooler — so keep each container's
# own pool small; pgbouncer handles fanning many containers into a few real Postgres conns.
_is_lambda = bool(os.environ.get("AWS_LAMBDA_FUNCTION_NAME"))
engine = create_engine(
    settings.database_url,
    pool_pre_ping=True,
    **({"pool_size": 1, "max_overflow": 1} if _is_lambda else {}),
)
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

Base = declarative_base()


def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
