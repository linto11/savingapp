import os
from urllib.parse import urlparse

from sqlalchemy import create_engine, text
from sqlalchemy.engine import URL
from sqlalchemy.orm import declarative_base, sessionmaker

from ..core import config as app_config

try:
    from dotenv import load_dotenv
    load_dotenv()
except Exception:
    pass

DEFAULT_SQLITE_URL = "sqlite:///./savings.db"
ACTIVE_DATABASE_PROVIDER = "sqlite"
ACTIVE_DATABASE_URL = DEFAULT_SQLITE_URL
RUNTIME_SUPABASE_PASSWORD = ""
RUNTIME_SUPABASE_KEY = ""
RUNTIME_SUPABASE_CONNECTION_STRING = ""


def normalize_database_url(url: str) -> str:
    if url.startswith("postgres://"):
        return url.replace("postgres://", "postgresql+psycopg://", 1)
    if url.startswith("postgresql://") and "+psycopg" not in url:
        return url.replace("postgresql://", "postgresql+psycopg://", 1)
    return url


def _extract_supabase_project_ref() -> str | None:
    supabase_url = (os.getenv("SUPABASE_URL") or "").strip()
    if not supabase_url:
        return None

    host = urlparse(supabase_url).netloc.lower()
    if host.endswith(".supabase.co"):
        return host.split(".")[0]
    return None


def _default_supabase_pooler_host() -> str:
    return (
        os.getenv("SUPABASE_DB_HOST")
        or os.getenv("SUPABASE_POOLER_HOST")
        or "aws-1-ap-northeast-1.pooler.supabase.com"
    ).strip()


def set_runtime_secrets(password: str | None = None, api_key: str | None = None, connection_string: str | None = None):
    global RUNTIME_SUPABASE_PASSWORD, RUNTIME_SUPABASE_KEY, RUNTIME_SUPABASE_CONNECTION_STRING

    if password is not None and str(password).strip():
        RUNTIME_SUPABASE_PASSWORD = str(password).strip()
    if api_key is not None and str(api_key).strip():
        RUNTIME_SUPABASE_KEY = str(api_key).strip()
    if connection_string is not None and str(connection_string).strip():
        RUNTIME_SUPABASE_CONNECTION_STRING = normalize_database_url(str(connection_string).strip())


def build_database_url(settings=None):
    settings = settings or app_config.load_settings()
    database_mode = (settings.get("database_mode") or "sqlite").lower()

    if database_mode == "supabase":
        explicit_database_url = (
            settings.get("supabase_connection_string")
            or RUNTIME_SUPABASE_CONNECTION_STRING
            or os.getenv("SUPABASE_CONNECTION_STRING")
            or ""
        ).strip()

        env_database_url = (os.getenv("DATABASE_URL") or "").strip()
        if not explicit_database_url and env_database_url and not env_database_url.startswith("sqlite"):
            explicit_database_url = env_database_url

        if explicit_database_url and not explicit_database_url.startswith("sqlite"):
            return normalize_database_url(explicit_database_url), "supabase"

        password = (settings.get("supabase_db_password") or RUNTIME_SUPABASE_PASSWORD or "").strip()
        project_ref = _extract_supabase_project_ref()
        db_user = (
            settings.get("supabase_db_user")
            or os.getenv("SUPABASE_DB_USER")
            or (f"postgres.{project_ref}" if project_ref else "postgres")
        ).strip()
        db_host = (settings.get("supabase_db_host") or _default_supabase_pooler_host()).strip()
        if password and db_host:
            sslmode = os.getenv("DB_SSLMODE", "require")
            supabase_url = URL.create(
                "postgresql+psycopg",
                username=db_user,
                password=password,
                host=db_host,
                port=int(settings.get("supabase_db_port", os.getenv("SUPABASE_DB_PORT", 5432))),
                database=settings.get("supabase_db_name", os.getenv("SUPABASE_DB_NAME", "postgres")),
                query={"sslmode": sslmode},
            )
            return supabase_url.render_as_string(hide_password=False), "supabase"

    return DEFAULT_SQLITE_URL, "sqlite"


def mask_database_url(url: str) -> str:
    if "@" in url and "://" in url:
        prefix, suffix = url.split("://", 1)
        if "@" in suffix:
            suffix = suffix.split("@", 1)[1]
            return f"{prefix}://***:***@{suffix}"
    return url


def create_configured_engine(url: str):
    connect_args = {"check_same_thread": False} if url.startswith("sqlite") else {}
    return create_engine(url, connect_args=connect_args, pool_pre_ping=True)


def validate_database_settings(settings=None):
    settings = settings or app_config.load_settings()
    desired_mode = (settings.get("database_mode") or "sqlite").lower()
    url, provider = build_database_url(settings)

    if desired_mode == "supabase" and provider != "supabase":
        raise ValueError("Supabase is selected, but the connection string or database password is missing.")

    test_engine = create_configured_engine(url)
    try:
        with test_engine.connect() as conn:
            conn.execute(text("SELECT 1"))
    finally:
        test_engine.dispose()

    return provider, url


Base = declarative_base()
SessionLocal = sessionmaker(autocommit=False, autoflush=False)
engine = None
SQLALCHEMY_DATABASE_URL = DEFAULT_SQLITE_URL
NORMALIZED_DATABASE_URL = DEFAULT_SQLITE_URL


def configure_database(settings=None, verify: bool = False):
    global engine, SQLALCHEMY_DATABASE_URL, NORMALIZED_DATABASE_URL, ACTIVE_DATABASE_PROVIDER, ACTIVE_DATABASE_URL

    settings = settings or app_config.load_settings()
    if verify:
        provider, url = validate_database_settings(settings)
    else:
        url, provider = build_database_url(settings)

    SQLALCHEMY_DATABASE_URL = url
    NORMALIZED_DATABASE_URL = normalize_database_url(url)
    ACTIVE_DATABASE_PROVIDER = provider
    ACTIVE_DATABASE_URL = url

    new_engine = create_configured_engine(NORMALIZED_DATABASE_URL)
    if engine is not None:
        engine.dispose()
    engine = new_engine
    SessionLocal.configure(bind=engine)
    return engine


def get_database_status():
    return {
        "provider": ACTIVE_DATABASE_PROVIDER,
        "url": mask_database_url(ACTIVE_DATABASE_URL),
    }


def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


try:
    configure_database(app_config.load_settings(), verify=False)
except Exception:
    SQLALCHEMY_DATABASE_URL = DEFAULT_SQLITE_URL
    NORMALIZED_DATABASE_URL = DEFAULT_SQLITE_URL
    ACTIVE_DATABASE_PROVIDER = "sqlite"
    ACTIVE_DATABASE_URL = DEFAULT_SQLITE_URL
    engine = create_configured_engine(DEFAULT_SQLITE_URL)
    SessionLocal.configure(bind=engine)
