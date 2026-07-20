"""
database.py
------------
Sets up the SQLAlchemy engine, session factory and declarative Base.
Every model in models.py inherits from `Base`.
`get_db()` is a FastAPI dependency that yields a DB session and
always closes it afterwards, even if an error occurs.
"""

from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker, declarative_base

from app.config import settings

# pool_pre_ping avoids "MySQL server has gone away" errors on idle connections
engine = create_engine(settings.DATABASE_URL, pool_pre_ping=True, echo=False)

SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

Base = declarative_base()


def get_db():
    """FastAPI dependency - provides a DB session per request."""
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
