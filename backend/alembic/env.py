import os
import sys
from logging.config import fileConfig

from sqlalchemy import engine_from_config
from sqlalchemy import pool

from alembic import context

# Make the backend package importable when running `alembic` from anywhere
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from database import Base  # noqa: E402
import models  # noqa: E402,F401  (registers all ORM tables on Base.metadata)

# this is the Alembic Config object, which provides
# access to the values within the .ini file in use.
config = context.config

# Read the database URL from the environment (.env / DATABASE_URL) instead of
# hard-coding it in alembic.ini
database_url = os.getenv(
    "DATABASE_URL", "postgresql://agripilot:agripilot@localhost:5432/agripilot"
)
# Normalise driver so psycopg2-binary is used (SQLAlchemy 2.x defaults
# "postgresql://" to psycopg v3, which is not installed).
if database_url.startswith("postgresql://"):
    database_url = database_url.replace("postgresql://", "postgresql+psycopg2://", 1)
config.set_main_option("sqlalchemy.url", database_url)


def _connection_url() -> str:
    """Return the configured URL, falling back to SQLite for offline/CI runs.

    Autogenerate against a live PostgreSQL server is the normal path; when no
    server is reachable we can still generate migrations with
    `ALEMBIC_FALLBACK_SQLITE=1 alembic revision --autogenerate`.
    """
    url = config.get_main_option("sqlalchemy.url")
    if os.getenv("ALEMBIC_FALLBACK_SQLITE") == "1":
        return "sqlite:///./alembic_fallback.db"
    return url

# Interpret the config file for Python logging.
# This line sets up loggers basically.
if config.config_file_name is not None:
    fileConfig(config.config_file_name)

# add your model's MetaData object here
# for 'autogenerate' support
# target_metadata to be used within the online/offline migration
target_metadata = Base.metadata


def run_migrations_offline() -> None:
    """Run migrations in 'offline' mode.

    This configures the context with just a URL
    and not an Engine, though an Engine is acceptable
    here as well.  By skipping the Engine creation
    we don't even need a DBAPI to be available.

    Calls to context.execute() here emit the given string to the
    script output.

    """
    url = _connection_url()
    context.configure(
        url=url,
        target_metadata=target_metadata,
        literal_binds=True,
        dialect_opts={"paramstyle": "named"},
        compare_type=True,
    )

    with context.begin_transaction():
        context.run_migrations()


def run_migrations_online() -> None:
    """Run migrations in 'online' mode.

    In this scenario we need to create an Engine
    and associate a connection with the context.

    """
    from sqlalchemy import create_engine

    connectable = create_engine(_connection_url(), poolclass=pool.NullPool)

    with connectable.connect() as connection:
        context.configure(
            connection=connection,
            target_metadata=target_metadata,
            compare_type=True,
            render_as_batch=_connection_url().startswith("sqlite"),
        )

        with context.begin_transaction():
            context.run_migrations()


if context.is_offline_mode():
    run_migrations_offline()
else:
    run_migrations_online()
