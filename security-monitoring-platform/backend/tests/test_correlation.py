import pytest
from datetime import datetime
from fastapi.testclient import TestClient
from app.main import app
from app.core.database import SessionLocal
from app.models.relationship import Relationship

client = TestClient(app)

def test_event_correlation_graph():
    ts = datetime.utcnow().isoformat()
    session_id = f"S-CORR-{datetime.utcnow().timestamp()}"

    # Ingest sequence: login -> resource access
    client.post("/api/ingest/events", json={
        "event_id": f"EV-CORR-1-{datetime.utcnow().timestamp()}",
        "user_id": "U002",
        "session_id": session_id,
        "event_type": "login_success",
        "timestamp": ts,
        "ip": "10.0.1.99",
        "resource": None,
        "source": "nodejs-demo",
        "status": "success",
        "security_flag": False
    })

    client.post("/api/ingest/events", json={
        "event_id": f"EV-CORR-2-{datetime.utcnow().timestamp()}",
        "user_id": "U002",
        "session_id": session_id,
        "event_type": "resource_access",
        "timestamp": ts,
        "ip": "10.0.1.99",
        "resource": "finance_q3.xlsx",
        "source": "nodejs-demo",
        "status": "success",
        "security_flag": False
    })

    # Query graph
    graph_res = client.get("/api/graph")
    assert graph_res.status_code == 200
    graph_data = graph_res.json()

    node_ids = {n["data"]["id"] for n in graph_data["nodes"]}
    assert "SERVER" in node_ids
    assert "user_U002" in node_ids
    assert f"session_{session_id}" in node_ids
    assert "ip_10.0.1.99" in node_ids
    assert "resource_finance_q3.xlsx" in node_ids

    # Verify edge existence
    edge_pairs = {(e["data"]["source"], e["data"]["target"]) for e in graph_data["edges"]}
    assert ("SERVER", "user_U002") in edge_pairs
    assert ("user_U002", f"session_{session_id}") in edge_pairs
    assert (f"session_{session_id}", "ip_10.0.1.99") in edge_pairs
    assert (f"session_{session_id}", "resource_finance_q3.xlsx") in edge_pairs
