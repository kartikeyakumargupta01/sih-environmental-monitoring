# ============================================================
# ENVIRONMENTAL PREDICTION SYSTEM
# DATABASE CONFIGURATION
# ============================================================

import os

from dotenv import load_dotenv

from sqlalchemy import create_engine
from sqlalchemy.orm import (
    declarative_base,
    sessionmaker,
)


# ============================================================
# LOAD ENVIRONMENT VARIABLES
# ============================================================

load_dotenv()


# ============================================================
# DATABASE URL
# ============================================================

DATABASE_URL = (
    os.getenv(
        "DATABASE_URL"
    )
    or ""
).strip()


if not DATABASE_URL:

    raise RuntimeError(
        "DATABASE_URL is missing from .env"
    )


# ============================================================
# SQLALCHEMY ENGINE
# ============================================================
#
# pool_pre_ping=True:
#
# Checks that a PostgreSQL connection is still alive
# before SQLAlchemy gives it to FastAPI.
#
# Useful when:
#
# - backend runs for a long time
# - ESP32 continuously posts sensor readings
# - database temporarily disconnects
#
# ============================================================

engine = create_engine(

    DATABASE_URL,

    pool_pre_ping=True,

    pool_recycle=1800,
)


# ============================================================
# DATABASE SESSION FACTORY
# ============================================================

SessionLocal = sessionmaker(

    autocommit=False,

    autoflush=False,

    bind=engine,
)


# ============================================================
# SQLALCHEMY BASE
# ============================================================
#
# All models inherit from this Base.
#
# Example:
#
# class SensorReading(Base):
#     ...
#
# ============================================================

Base = declarative_base()


# ============================================================
# FASTAPI DATABASE DEPENDENCY
# ============================================================
#
# Each API request receives its own database session.
#
# The session is always closed when the request finishes.
#
# ============================================================

def get_db():

    db = SessionLocal()

    try:

        yield db

    finally:

        db.close()