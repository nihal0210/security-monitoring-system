# Security Monitoring Platform — Backend API & Correlation Engine

A high-performance Python FastAPI service responsible for centralized event ingestion, normalization validation, cross-source entity correlation, real-time WebSocket telemetry, historical state reconstruction, and deterministic security anomaly detection.

---

## Architecture Overview
- **Event Ingestion**:
  - `POST /api/ingest/events` & `POST /api/events`
  - Validates incoming events against the **Common Event Schema**.
  - Idempotent deduplication based on `event_id`.
- **Temporal Correlation Engine**:
  - Correlates events across: `Server -> User -> Session -> IP -> Resource`.
  - Dynamically builds directed relationship graphs represented in Cytoscape.js format.
- **Deterministic Rule-Based Security Engine**:
  - **Rule 1 (Repeated Failed Login)**: >= 5 failed attempts in 2 minutes &rarr; `HIGH` severity alert.
  - **Rule 2 (Multiple Rapid Logins)**: Concurrent sessions created in &lt; 15 seconds &rarr; `MEDIUM` severity alert.
  - **Rule 3 (Multiple IP Activity)**: Same user active across &gt;= 3 distinct subnets within 5 minutes &rarr; `HIGH` severity alert.
  - **Rule 4 (Suspicious Activity Sequence)**: Failed logins &rarr; Success &rarr; New IP &rarr; Sensitive resource access &rarr; `CRITICAL` severity alert.
  - **Rule 5 (Abnormal API Burst)**: &gt; 20 requests in 10 seconds &rarr; `MEDIUM` severity alert.
- **Historical State Reconstruction**:
  - `GET /api/history?timestamp=...`: Reconstructs the observed system topology and entity states at any specified historical point in time $T$.
- **Real-Time Telemetry via WebSockets**:
  - `/ws`: Real-time streaming of new events, alerts, graph updates, and system metrics.

---

## Installation & Running

### 1. Create and Activate Virtual Environment
```bash
python -m venv venv
# On Windows:
.\venv\Scripts\activate
# On Linux/macOS:
source venv/bin/activate
```

### 2. Install Dependencies
```bash
pip install -r requirements.txt
```

### 3. Configure Database
Configure your environment variables in `.env`:
```env
DATABASE_URL=postgresql://postgres:postgres@localhost:5432/security_monitoring
FASTAPI_PORT=8000
HOST=0.0.0.0
```
> **Note**: If PostgreSQL is not reachable, the system automatically falls back to local SQLite (`monitoring_platform.db`) to ensure zero-friction local development and testing.

Initialize tables:
```bash
python setup_db.py
```

### 4. Start Backend Server
```bash
uvicorn app.main:app --host 0.0.0.0 --port 8000 --reload
```

Interactive OpenAPI Swagger Documentation: `http://localhost:8000/docs`

### 5. Run Automated Tests
```bash
python -m pytest -v
```
