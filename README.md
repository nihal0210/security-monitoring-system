# Real-Time Server Monitoring and Temporal User Activity Visualization System

### *A Temporal User-Centric Security Monitoring and Anomaly Detection Framework for Heterogeneous Backend Systems*

---

## 1. Project Overview & Architecture

Modern enterprise backend architectures distribute logging information across disparate authentication services, databases, application routers, and session stores. This project establishes a centralized, backend-agnostic security monitoring and temporal visualization framework capable of collecting, normalizing, and correlating heterogeneous backend events.

The system is partitioned into **TWO completely decoupled and independently runnable projects**:

```text
security-monitoring-system/
│
├── controlled-backend-server/            # Node.js + Express + SQLite test environment
│   ├── src/agent/monitoring-connector.js # Embedded monitoring connector normalizing events
│   ├── src/routes/demo.js               # Controlled scenario triggers (A, B, C, D, E)
│   └── public/demo.html                 # Interactive test server control panel (:3000/demo)
│
└── security-monitoring-platform/         # Central monitoring system
    ├── backend/                         # FastAPI + PostgreSQL/SQLite + WebSockets
    │   ├── app/services/ingestion.py    # Idempotent event ingestion
    │   ├── app/services/correlation.py  # User -> Session -> IP -> Resource graph correlation
    │   ├── app/services/security_engine.py # Deterministic Rules 1 to 5
    │   └── app/services/historical.py   # Historical state reconstruction at timestamp T
    └── frontend/                        # React + Vite + Cytoscape.js + SOC Dashboard (:5173)
```

```text
Heterogeneous Backend (Node.js Test Environment)
       ↓
Monitoring Agent Connector
       ↓
Common Event Schema (Normalized JSON)
       ↓
FastAPI Ingestion Pipeline (Deduplication & Validation)
       ↓
PostgreSQL Central Event Store
       ↓
Cross-Source Entity Correlation (Server → User → Session → IP → Resource)
       ↓
Deterministic Security Rule Engine (Rules 1 - 5)
       ↓
WebSocket Telemetry Broadcaster
       ↓
React Operations Center Dashboard (Cytoscape Temporal Graph + Historical Replay)
```

---

## 2. The Common Event Schema

All heterogeneous backend collectors translate source-specific data into the standardized Common Event Schema:

```json
{
  "event_id": "E-1727101800-4f9b2a1c",
  "user_id": "U001",
  "session_id": "S-k9z3-A8F2",
  "event_type": "resource_access",
  "timestamp": "2026-09-23T19:30:00Z",
  "ip": "192.168.1.20",
  "resource": "report.pdf",
  "source": "nodejs-demo",
  "status": "success",
  "security_flag": false,
  "metadata": {
    "classification": "CONFIDENTIAL"
  }
}
```

---

## 3. Seeded Demo Users & Enterprise Resources

### Demo Users (Password for all: `password123`)
* `U001`: **Rahul Sharma** — Engineering (Lead Architect)
* `U002`: **Amit Patel** — Finance (Financial Analyst)
* `U003`: **Priya Singh** — Human Resources (HR Manager)
* `U004`: **Neha Gupta** — Sales (Account Executive)
* `U005`: **Rohan Verma** — Marketing (Growth Lead)

### Enterprise File Resources
* `report.pdf`: Confidential Q3 Corporate Performance & Projections Report
* `finance_q3.xlsx`: Restricted Internal Balance Sheet & Revenue Analysis
* `system_config.json`: Critical Infrastructure Configuration & Secrets
* `customer_data.csv`: Enterprise Customer Registry
* `audit_log.txt`: Compliance & Audit Records

---

## 4. Deterministic Security Rules

1. **Rule 1 — Repeated Failed Login (`SEV_HIGH`)**: $\ge 5$ consecutive failed authentication attempts within 2 minutes for the same user account (brute-force indicator).
2. **Rule 2 — Multiple Rapid Logins (`SEV_MEDIUM`)**: Multiple concurrent sessions established in $< 15$ seconds for the same user.
3. **Rule 3 — Multiple IP Activity (`SEV_HIGH`)**: Same user account concurrently active across $\ge 3$ distinct subnets within a 5-minute rolling window.
4. **Rule 4 — Suspicious Activity Sequence (`SEV_CRITICAL`)**: Failed logins $\rightarrow$ Successful authentication $\rightarrow$ Direct access to sensitive file (`system_config.json`, `finance_q3.xlsx`) within 3 minutes (account compromise chain).
5. **Rule 5 — Abnormal API Activity (`SEV_MEDIUM`)**: High-frequency traffic burst exceeding 20 requests in 10 seconds.

---

## 5. Quick Start & Execution Guide

### Prerequisites
* **Node.js**: v18+ (tested on Node v24)
* **Python**: 3.10+ (tested on Python 3.11)
* **PostgreSQL**: (Optional; system automatically falls back to local SQLite if PostgreSQL is not running)

---

### Step 1: Start Controlled Backend Server (Terminal 1)
```bash
cd controlled-backend-server
npm install
npm start
```
* **API Base**: `http://localhost:3000`
* **Interactive Demo Control Panel**: `http://localhost:3000/demo`

---

### Step 2: Start Central Monitoring Backend (Terminal 2)
```bash
cd security-monitoring-platform/backend
# Activate virtual environment
.\venv\Scripts\activate      # Windows
# source venv/bin/activate   # Linux/macOS

pip install -r requirements.txt
python setup_db.py
uvicorn app.main:app --host 0.0.0.0 --port 8000 --reload
```
* **API Base**: `http://localhost:8000`
* **Interactive OpenAPI Swagger Docs**: `http://localhost:8000/docs`
* **WebSocket Telemetry Stream**: `ws://localhost:8000/ws`

---

### Step 3: Start Operations Center React Dashboard (Terminal 3)
```bash
cd security-monitoring-platform/frontend
npm install
npm run dev
```
* **Dashboard URL**: `http://localhost:5173`

---

## 6. Faculty Demonstration Walkthrough (Step-by-Step)

Follow this structured workflow for evaluation:

1. **Open Dashboard**: Navigate to `http://localhost:5173`.
   - Observe **Server Status: ONLINE**, **Total Users: 5**, and the live **Cytoscape Temporal Graph** showing the central `SERVER` hub connected to seeded enterprise users (`U001` - `U005`).
   - Notice the green pulsing **LIVE TELEMETRY** indicator and live UTC clock.
2. **Open Controlled Backend Demo Panel**: Open `http://localhost:3000/demo` in an adjacent browser tab.
3. **Scenario A — Normal Activity**:
   - In the Demo Panel, click `[ Generate Normal Activity ]`.
   - Switch back to the dashboard: Observe new events appearing in the live telemetry feed without page refresh.
   - The Cytoscape graph dynamically generates: `SERVER` $\rightarrow$ `User U001` $\rightarrow$ `Session` $\rightarrow$ `IP` $\rightarrow$ `report.pdf`.
4. **Scenario B — Repeated Authentication Failure**:
   - In the Demo Panel, click `[ Simulate Repeated Authentication Failure ]`.
   - Watch 5 failed login attempts followed by 1 successful login stream in.
   - The **Security Engine** independently triggers **Rule 1 (Repeated Failed Login)**.
   - A `HIGH` severity alert appears in the **Security Alerts Panel**.
   - User `U001`'s status changes to `SUSPICIOUS` and their Risk Score increases.
5. **Scenario C — Suspicious Login Sequence (Attack Chain)**:
   - Click `[ Simulate Suspicious Login Sequence ]`.
   - An anomaly occurs: Failed logins $\rightarrow$ Success from untrusted IP `203.0.113.88` $\rightarrow$ Access to sensitive `system_config.json`.
   - The Security Engine flags **Rule 4 (Suspicious Activity Sequence)** as `CRITICAL`.
   - Node `user_U003` glows crimson in the Cytoscape graph.
6. **Investigate Flagged User**:
   - In the User Directory, click **Investigate** on `U003`.
   - The **Deep Investigation Drawer** slides open showing active sessions, observed external IPs, sensitive accessed resources, and the chronological attack-chain timeline.
7. **Historical State Reconstruction (Temporal Replay)**:
   - Locate the **Historical State Time Scrubber** slider.
   - Drag the slider backward in time (e.g. 5 minutes earlier).
   - The dashboard transitions into **HISTORICAL RECONSTRUCTION MODE** with an amber indicator.
   - The Cytoscape graph automatically reconstructs the exact observed topological state at that historical timestamp—suspicious nodes and critical alerts that occurred later vanish.
   - Click **Return to LIVE** to instantaneously restore real-time telemetry streaming.

---

## 7. Automated Test Suites

### Controlled Backend Tests
```bash
cd controlled-backend-server
npm test
```
*Validates database seeding, user retrieval, resource catalog, and Common Event Schema normalization.*

### Monitoring Platform Backend Tests
```bash
cd security-monitoring-platform/backend
.\venv\Scripts\python -m pytest -v
```
*Validates event ingestion, idempotency deduplication, malformed payload rejection, graph correlation, Rules 1 through 5, and historical reconstruction.*

### Frontend Production Build
```bash
cd security-monitoring-platform/frontend
npm run build
```
*Verifies complete JSX compilation, asset bundling, and CSS integrity.*
