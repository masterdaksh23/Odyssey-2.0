"""AgriPilot AI - backend configuration.

Reads settings from environment variables (with optional .env file support).
"""

import os

try:  # python-dotenv is optional; env vars can also be set directly
    from dotenv import load_dotenv

    load_dotenv()
except ImportError:  # pragma: no cover
    pass


def get_database_url() -> str:
    """PostgreSQL connection string, e.g. postgresql://user:pass@host:5432/db"""
    return os.getenv(
        "DATABASE_URL",
        "postgresql://agripilot:agripilot@localhost:5432/agripilot",
    )
