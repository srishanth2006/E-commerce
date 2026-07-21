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

# pool_pre_ping avoids "MySQL server has gone away" errors on idle connections.
# connect_args enable TLS (required by TiDB Cloud) and set a startup timeout
# so the app can start even if the database is temporarily unreachable.
_engine_kwargs = dict(
    pool_pre_ping=True,
    echo=False,
    pool_recycle=300,
    pool_timeout=10,
)

# TiDB Cloud (and most cloud MySQL providers) require SSL.
_url = settings.DATABASE_URL
if "tidbcloud.com" in _url or "tidb" in _url.lower():
    _engine_kwargs["connect_args"] = {
        "ssl": {"ssl_ca": "/etc/ssl/certs/ca-certificates.crt"},
    }

engine = create_engine(_url, **_engine_kwargs)

SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

Base = declarative_base()


def get_db():
    """FastAPI dependency - provides a DB session per request."""
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
