# Controlled Backend Test Environment

A controlled Node.js backend environment that simulates realistic enterprise application activity, authentication flows, session handling, resource accesses, and security incidents.

This environment acts as a realistic external event source for the **Security Monitoring Platform**. It normalizes all internal activities into the **Common Event Schema** and ships them asynchronously via an embedded monitoring agent connector.

---

## Features
- **Realistic Enterprise REST APIs**:
  - `POST /login`: Authentication with credential checking and session provisioning.
  - `POST /logout`: Terminating active sessions and recording logout events.
  - `GET /users`: Monitored employee directory (seeded with demo users `U001` - `U005`).
  - `GET /profile`: Profile retrieval recording API telemetry.
  - `GET /files` & `GET /files/:filename`: Standard and sensitive file access telemetry.
  - `GET /sessions`: Active and terminated session inspection.
  - `GET /activity`: Local activity log inspection.
- **Embedded Monitoring Agent / Connector**:
  - Normalizes raw application events into the standardized **Common Event Schema**.
  - Non-blocking transmission to the central monitoring platform (`POST /api/ingest/events`).
  - In-memory queue with automatic retry buffer to prevent application crashes when the monitoring platform is starting.
- **Interactive Demonstration Control Panel (`http://localhost:3000/demo`)**:
  - `[ Generate Normal Activity ]`: Routine login, document inspection, and clean logout.
  - `[ Simulate Repeated Authentication Failure ]`: 5 failed logins followed by 1 successful login.
  - `[ Simulate Suspicious Login Sequence ]`: Failed attempts, successful login from anomalous IP, immediate access to sensitive system config.
  - `[ Simulate Multiple IP Activity ]`: Same user account active concurrently across 3 distinct subnets.
  - `[ Simulate Abnormal API Activity ]`: High-frequency burst of 25 rapid API queries in under 2 seconds.
- **SQLite Database**:
  - Pre-seeded with demo accounts (`U001` to `U005`) and enterprise files (`report.pdf`, `finance_q3.xlsx`, `system_config.json`, etc.).

---

## Demo Credentials
| User ID | Full Name | Department | Role | Default Password |
|---|---|---|---|---|
| `U001` | Rahul Sharma | Engineering | Lead Architect | `password123` |
| `U002` | Amit Patel | Finance | Financial Analyst | `password123` |
| `U003` | Priya Singh | Human Resources | HR Manager | `password123` |
| `U004` | Neha Gupta | Sales | Account Executive | `password123` |
| `U005` | Rohan Verma | Marketing | Growth Lead | `password123` |

---

## Installation & Running

### 1. Install Dependencies
```bash
npm install
```

### 2. Environment Variables
Create or verify `.env` (defaults are preconfigured):
```env
PORT=3000
MONITORING_PLATFORM_URL=http://localhost:8000/api/ingest/events
SQLITE_PATH=./backend.sqlite
NODE_ENV=development
```

### 3. Run Server
```bash
npm start
# Or for development:
npm run dev
```

The server will be reachable at:
- **API Base**: `http://localhost:3000`
- **Demo Control Panel**: `http://localhost:3000/demo`

### 4. Run Automated Tests
```bash
npm test
```
