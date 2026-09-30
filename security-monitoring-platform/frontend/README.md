# Security Monitoring Platform — React Cybersecurity Operations Center Dashboard

A modern, responsive React + Vite operations center dashboard built for real-time security monitoring, cross-source entity correlation, and historical state reconstruction.

---

## Features
- **Cytoscape.js Temporal Graph**:
  - Live directed graph visualization representing `SERVER -> USER -> SESSION -> IP -> RESOURCE`.
  - Dynamic semantic coloring (Active: Emerald, Warning: Amber, Critical Anomaly: Red, Inactive: Slate).
  - Multiple layout algorithms (Force-Directed COSE, Hierarchical Tree, Circle).
  - Node filtering toggles (Hide/Show IP addresses, Hide/Show Resources).
- **Historical Reconstruction Time Scrubber**:
  - Interactive timeline scrubber slider to reconstruct the system's observed topological state at any historical moment.
  - Dedicated **LIVE** vs **HISTORICAL** view separation with a one-click `Return to LIVE` trigger.
- **Server Overview Metrics**:
  - Live server status, active users, active sessions, rolling events/min, and security alerts breakdown.
- **Monitored Enterprise Users Directory**:
  - Tabular view of monitored enterprise users (`U001` - `U005`) with live status (Active, Inactive, Suspicious) and Project Risk Indicators.
- **Deep Investigation Drawer (Attack Chain View)**:
  - Slide-over investigation panel displaying a user's active sessions, observed IPs, accessed resources, failed login counts, associated alerts, and chronological attack-chain events.
- **Security Alerts & Live Telemetry Explorer**:
  - Real-time stream of detected security alerts with severity chips.
  - Live normalized event stream with raw Common Event Schema JSON inspector.

---

## Installation & Running

### 1. Install Dependencies
```bash
npm install
```

### 2. Run Local Development Server
```bash
npm run dev
```

The frontend will run at: `http://localhost:5173` (proxies `/api` and `/ws` to `http://localhost:8000`).

### 3. Build for Production
```bash
npm run build
```
