"""
database.py — SQLAlchemy engine and session setup.
Uses SQLite for local development. PostgreSQL can be configured
by changing DATABASE_URL in .env without modifying this file.
"""

from sqlalchemy import create_engine
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import sessionmaker
from app.config import settings
import os

# Ensure data directory exists for SQLite file
db_url = settings.DATABASE_URL
if db_url.startswith("sqlite"):
    db_path = db_url.replace("sqlite:///", "").replace("./", "")
    os.makedirs(os.path.dirname(db_path) if os.path.dirname(db_path) else ".", exist_ok=True)

# Create SQLAlchemy engine
# connect_args={"check_same_thread": False} is required for SQLite + FastAPI threading
engine = create_engine(
    db_url,
    connect_args={"check_same_thread": False} if "sqlite" in db_url else {},
    echo=False,  # Set to True to log all SQL statements during debugging
)

# Session factory — used in dependency injection
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

# Base class for all ORM models
Base = declarative_base()


def get_db():
    """
    FastAPI dependency that provides a database session.
    Ensures the session is closed after the request completes.
    """
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


def init_db():
    """Create all tables if they do not exist and ensure columns are up-to-date."""
    from app.database import models  # noqa: F401 — import to register models
    Base.metadata.create_all(bind=engine)

    # Safe migration for existing SQLite database to add mq2_value if it doesn't exist
    try:
        from sqlalchemy import text
        with engine.connect() as conn:
            # Check columns in sensor_readings
            result = conn.execute(text("PRAGMA table_info(sensor_readings)"))
            columns = [row[1] for row in result.fetchall()]
            if columns and "mq2_value" not in columns:
                conn.execute(text("ALTER TABLE sensor_readings ADD COLUMN mq2_value FLOAT"))
                # If mq135_value exists in legacy db, copy values over
                if "mq135_value" in columns:
                    conn.execute(text("UPDATE sensor_readings SET mq2_value = mq135_value WHERE mq2_value IS NULL"))
                conn.commit()
    except Exception:
        pass  # Non-sqlite or table just created
