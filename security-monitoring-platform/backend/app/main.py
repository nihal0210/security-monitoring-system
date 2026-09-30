import logging
from contextlib import asynccontextmanager
from fastapi import FastAPI, WebSocket, WebSocketDisconnect
from fastapi.middleware.cors import CORSMiddleware
from app.core.config import settings
from app.core.database import init_db, SessionLocal
from app.models.user import User
from app.models.relationship import Relationship
from app.services.websocket_manager import ws_manager
from app.api import (
    routes_ingest,
    routes_users,
    routes_events,
    routes_sessions,
    routes_alerts,
    routes_graph,
    routes_history,
    routes_stats,
    routes_reset,
    routes_hierarchical
)

logger = logging.getLogger("uvicorn.error")

def seed_initial_users():
    """
    Seeds initial enterprise monitored users into the central database if not already present.
    """
    db = SessionLocal()
    try:
        count = db.query(User).count()
        if count == 0:
            logger.info("[Database] Bootstrapping enterprise monitored users (U001 to U005)...")
            initial_users = [
                User(user_id="U001", name="Rahul Sharma", department="Engineering", role="Lead Architect"),
                User(user_id="U002", name="Amit Patel", department="Finance", role="Financial Analyst"),
                User(user_id="U003", name="Priya Singh", department="Human Resources", role="HR Manager"),
                User(user_id="U004", name="Neha Gupta", department="Sales", role="Account Executive"),
                User(user_id="U005", name="Rohan Verma", department="Marketing", role="Growth Lead"),
            ]
            for u in initial_users:
                db.add(u)
                # Link SERVER -> USER
                r = Relationship(
                    source_type="SERVER",
                    source_id="SERVER",
                    target_type="USER",
                    target_id=u.user_id,
                    relation_type="MONITORS"
                )
                db.add(r)
            db.commit()
            logger.info("[Database] Initial enterprise users seeded.")
    except Exception as e:
        logger.error(f"[Database] Error seeding initial users: {e}")
        db.rollback()
    finally:
        db.close()

@asynccontextmanager
async def lifespan(app: FastAPI):
    # Startup
    logger.info("Initializing Security Monitoring Platform Backend...")
    init_db()
    seed_initial_users()
    yield
    # Shutdown
    logger.info("Shutting down Security Monitoring Platform Backend...")

app = FastAPI(
    title=settings.PROJECT_NAME,
    version=settings.PROJECT_VERSION,
    description="Centralized Event Ingestion, Temporal Correlation & Rule-Based Security Engine",
    lifespan=lifespan
)

# CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.CORS_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Mount REST API routers
app.include_router(routes_ingest.router, prefix=settings.API_V1_STR)
app.include_router(routes_users.router, prefix=settings.API_V1_STR)
app.include_router(routes_events.router, prefix=settings.API_V1_STR)
app.include_router(routes_sessions.router, prefix=settings.API_V1_STR)
app.include_router(routes_alerts.router, prefix=settings.API_V1_STR)
app.include_router(routes_graph.router, prefix=settings.API_V1_STR)
app.include_router(routes_history.router, prefix=settings.API_V1_STR)
app.include_router(routes_stats.router, prefix=settings.API_V1_STR)
app.include_router(routes_reset.router, prefix=settings.API_V1_STR)
app.include_router(routes_hierarchical.router, prefix=settings.API_V1_STR)

# Direct root health
@app.get("/health")
def health_check():
    return {
        "status": "ONLINE",
        "service": "Security Monitoring Platform API",
        "version": settings.PROJECT_VERSION
    }

# WebSocket Endpoint
@app.websocket("/ws")
async def websocket_endpoint(websocket: WebSocket):
    await ws_manager.connect(websocket)
    try:
        while True:
            # Keep-alive receive loop
            msg = await websocket.receive_text()
            if msg == "ping":
                await websocket.send_text("pong")
    except WebSocketDisconnect:
        ws_manager.disconnect(websocket)
    except Exception as e:
        logger.warning(f"[WebSocket] Connection closed with error: {e}")
        ws_manager.disconnect(websocket)
