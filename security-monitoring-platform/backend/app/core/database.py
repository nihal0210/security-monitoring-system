import logging
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker, declarative_base
from app.core.config import settings

logger = logging.getLogger("uvicorn.error")

Base = declarative_base()

def get_engine():
    # Attempt primary database connection (PostgreSQL)
    try:
        engine = create_engine(
            settings.DATABASE_URL,
            pool_pre_ping=True
        )
        with engine.connect() as conn:
            logger.info(f"[Database] Successfully connected to primary database: {settings.DATABASE_URL.split('@')[-1]}")
        return engine
    except Exception as e:
        logger.warning(
            f"[Database] Primary database ({settings.DATABASE_URL.split('@')[-1]}) not reachable: {e}. "
            f"Falling back to local SQLite: {settings.SQLITE_FALLBACK_URL}"
        )
        # SQLite fallback engine
        engine = create_engine(
            settings.SQLITE_FALLBACK_URL,
            connect_args={"check_same_thread": False}
        )
        return engine

engine = get_engine()
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()

def init_db():
    from app.models import event, user, session, resource, relationship, alert
    Base.metadata.create_all(bind=engine)
    logger.info("[Database] All tables initialized successfully.")
