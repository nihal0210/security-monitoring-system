import pytest
from datetime import datetime
from fastapi.testclient import TestClient
from app.main import app
from app.core.database import SessionLocal, Base, engine

client = TestClient(app)

@pytest.fixture(autouse=True)
def setup_db():
    Base.metadata.create_all(bind=engine)
    yield

def test_health_check():
    response = client.get("/health")
    assert response.status_code == 200
    data = response.json()
    assert data["status"] == "ONLINE"

def test_ingest_single_event():
    event_payload = {
        "event_id": f"TEST-INGEST-{datetime.utcnow().timestamp()}",
        "user_id": "U001",
        "session_id": "S_TEST_01",
        "event_type": "login_success",
        "timestamp": datetime.utcnow().isoformat(),
        "ip": "192.168.1.100",
        "resource": None,
        "source": "nodejs-demo",
        "status": "success",
        "security_flag": False,
        "metadata": {"test": True}
    }

    response = client.post("/api/ingest/events", json=event_payload)
    assert response.status_code == 201
    data = response.json()
    assert data["status"] == "success"
    assert data["duplicate"] is False

def test_duplicate_event_idempotency():
    dup_id = f"TEST-DUP-{datetime.utcnow().timestamp()}"
    event_payload = {
        "event_id": dup_id,
        "user_id": "U001",
        "session_id": "S_TEST_DUP",
        "event_type": "login_success",
        "timestamp": datetime.utcnow().isoformat(),
        "ip": "192.168.1.100",
        "resource": None,
        "source": "nodejs-demo",
        "status": "success",
        "security_flag": False
    }

    # First ingestion
    r1 = client.post("/api/ingest/events", json=event_payload)
    assert r1.status_code == 201
    assert r1.json()["duplicate"] is False

    # Second ingestion of the exact same event_id
    r2 = client.post("/api/ingest/events", json=event_payload)
    assert r2.status_code == 201
    assert r2.json()["duplicate"] is True

def test_malformed_event_handling():
    # Missing required timestamp and event_type
    bad_payload = {
        "event_id": "TEST-BAD",
        "user_id": "U001"
    }

    response = client.post("/api/ingest/events", json=bad_payload)
    assert response.status_code == 422
