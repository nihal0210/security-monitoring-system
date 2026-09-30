import pytest
from datetime import datetime, timedelta
from fastapi.testclient import TestClient
from app.main import app

client = TestClient(app)

def test_historical_reconstruction():
    base_time = datetime(2026, 9, 23, 10, 0, 0)
    t1 = base_time + timedelta(minutes=10) # 10:10
    t2 = base_time + timedelta(minutes=20) # 10:20
    t3 = base_time + timedelta(minutes=30) # 10:30

    test_user = f"U_HIST_{int(datetime.utcnow().timestamp())}"
    session_id = f"S-HIST-{int(datetime.utcnow().timestamp())}"

    # Event at T1 (10:10): Login
    client.post("/api/ingest/events", json={
        "event_id": f"EV-HIST-1-{test_user}",
        "user_id": test_user,
        "session_id": session_id,
        "event_type": "login_success",
        "timestamp": t1.isoformat(),
        "ip": "192.168.1.90",
        "resource": None,
        "source": "nodejs-demo",
        "status": "success",
        "security_flag": False
    })

    # Event at T2 (10:20): Resource access
    client.post("/api/ingest/events", json={
        "event_id": f"EV-HIST-2-{test_user}",
        "user_id": test_user,
        "session_id": session_id,
        "event_type": "resource_access",
        "timestamp": t2.isoformat(),
        "ip": "192.168.1.90",
        "resource": "audit_log.txt",
        "source": "nodejs-demo",
        "status": "success",
        "security_flag": False
    })

    # Historical reconstruction at 10:05 (Prior to all events)
    res_before = client.get(f"/api/history?timestamp={(base_time + timedelta(minutes=5)).isoformat()}")
    assert res_before.status_code == 200
    data_before = res_before.json()
    assert test_user not in [u["user_id"] for u in data_before["active_users"]]

    # Historical reconstruction at 10:15 (After login, before resource access)
    res_t1_plus = client.get(f"/api/history?timestamp={(base_time + timedelta(minutes=15)).isoformat()}")
    assert res_t1_plus.status_code == 200
    data_t1 = res_t1_plus.json()
    assert test_user in [u["user_id"] for u in data_t1["active_users"]]
    assert "audit_log.txt" not in data_t1["accessed_resources"]

    # Historical reconstruction at 10:25 (After resource access)
    res_t2_plus = client.get(f"/api/history?timestamp={(base_time + timedelta(minutes=25)).isoformat()}")
    assert res_t2_plus.status_code == 200
    data_t2 = res_t2_plus.json()
    assert test_user in [u["user_id"] for u in data_t2["active_users"]]
    assert "audit_log.txt" in data_t2["accessed_resources"]
