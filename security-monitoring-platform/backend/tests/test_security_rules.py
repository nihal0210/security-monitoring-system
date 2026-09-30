import pytest
from datetime import datetime, timedelta
from fastapi.testclient import TestClient
from app.main import app

client = TestClient(app)

def test_rule_1_repeated_failed_logins():
    user_id = f"U_TEST_R1_{int(datetime.utcnow().timestamp())}"
    now = datetime.utcnow()

    # Emit 5 failed login events within 30 seconds
    for i in range(5):
        event_time = now - timedelta(seconds=(5 - i) * 5)
        res = client.post("/api/ingest/events", json={
            "event_id": f"EV-R1-{user_id}-{i}",
            "user_id": user_id,
            "session_id": None,
            "event_type": "login_failed",
            "timestamp": event_time.isoformat(),
            "ip": "192.168.1.111",
            "resource": None,
            "source": "nodejs-demo",
            "status": "failed",
            "security_flag": False
        })
        assert res.status_code == 201

    # Verify that a security alert was generated
    alerts_res = client.get(f"/api/alerts?user_id={user_id}")
    assert alerts_res.status_code == 200
    alerts = alerts_res.json()
    assert len(alerts) >= 1
    assert alerts[0]["rule_name"] == "RULE_REPEATED_FAILED_LOGIN"
    assert alerts[0]["severity"] == "HIGH"

    # Verify user status updated to suspicious
    user_res = client.get(f"/api/users/{user_id}")
    assert user_res.status_code == 200
    assert user_res.json()["status"] == "suspicious"

def test_rule_3_multiple_ip_activity():
    user_id = f"U_TEST_R3_{int(datetime.utcnow().timestamp())}"
    now = datetime.utcnow()
    ips = ["192.168.1.10", "10.0.0.50", "172.16.2.80"]

    for i, ip in enumerate(ips):
        client.post("/api/ingest/events", json={
            "event_id": f"EV-R3-{user_id}-{i}",
            "user_id": user_id,
            "session_id": f"S-R3-{i}",
            "event_type": "login_success",
            "timestamp": (now - timedelta(seconds=(3 - i) * 10)).isoformat(),
            "ip": ip,
            "resource": None,
            "source": "nodejs-demo",
            "status": "success",
            "security_flag": False
        })

    alerts_res = client.get(f"/api/alerts?user_id={user_id}")
    assert alerts_res.status_code == 200
    alerts = alerts_res.json()
    rule_3_alerts = [a for a in alerts if a["rule_name"] == "RULE_MULTIPLE_IP_ACTIVITY"]
    assert len(rule_3_alerts) >= 1
    assert rule_3_alerts[0]["severity"] == "HIGH"

def test_rule_4_suspicious_activity_sequence():
    user_id = f"U_TEST_R4_{int(datetime.utcnow().timestamp())}"
    now = datetime.utcnow()

    # Step 1: Failed login
    client.post("/api/ingest/events", json={
        "event_id": f"EV-R4-1-{user_id}",
        "user_id": user_id,
        "session_id": None,
        "event_type": "login_failed",
        "timestamp": (now - timedelta(seconds=60)).isoformat(),
        "ip": "192.168.1.200",
        "resource": None,
        "source": "nodejs-demo",
        "status": "failed",
        "security_flag": False
    })

    # Step 2: Successful login from new IP
    session_id = f"S-R4-{user_id}"
    client.post("/api/ingest/events", json={
        "event_id": f"EV-R4-2-{user_id}",
        "user_id": user_id,
        "session_id": session_id,
        "event_type": "login_success",
        "timestamp": (now - timedelta(seconds=30)).isoformat(),
        "ip": "203.0.113.99",
        "resource": None,
        "source": "nodejs-demo",
        "status": "success",
        "security_flag": False
    })

    # Step 3: Direct sensitive resource access
    client.post("/api/ingest/events", json={
        "event_id": f"EV-R4-3-{user_id}",
        "user_id": user_id,
        "session_id": session_id,
        "event_type": "resource_access",
        "timestamp": now.isoformat(),
        "ip": "203.0.113.99",
        "resource": "system_config.json",
        "source": "nodejs-demo",
        "status": "success",
        "security_flag": False
    })

    alerts_res = client.get(f"/api/alerts?user_id={user_id}")
    assert alerts_res.status_code == 200
    alerts = alerts_res.json()
    rule_4_alerts = [a for a in alerts if a["rule_name"] == "RULE_SUSPICIOUS_ACTIVITY_SEQUENCE"]
    assert len(rule_4_alerts) >= 1
    assert rule_4_alerts[0]["severity"] == "CRITICAL"
