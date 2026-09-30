const API_BASE = '/api';

export async function fetchStats() {
  const res = await fetch(`${API_BASE}/stats`);
  if (!res.ok) throw new Error('Failed to fetch stats');
  return res.json();
}

export async function fetchUsers() {
  const res = await fetch(`${API_BASE}/users`);
  if (!res.ok) throw new Error('Failed to fetch users');
  return res.json();
}

export async function fetchUserDetail(userId) {
  const res = await fetch(`${API_BASE}/users/${encodeURIComponent(userId)}`);
  if (!res.ok) throw new Error(`Failed to fetch user ${userId}`);
  return res.json();
}

export async function fetchEvents(params = {}) {
  const query = new URLSearchParams(params).toString();
  const res = await fetch(`${API_BASE}/events?${query}`);
  if (!res.ok) throw new Error('Failed to fetch events');
  return res.json();
}

export async function fetchSessions(params = {}) {
  const query = new URLSearchParams(params).toString();
  const res = await fetch(`${API_BASE}/sessions?${query}`);
  if (!res.ok) throw new Error('Failed to fetch sessions');
  return res.json();
}

export async function fetchAlerts(params = {}) {
  const query = new URLSearchParams(params).toString();
  const res = await fetch(`${API_BASE}/alerts?${query}`);
  if (!res.ok) throw new Error('Failed to fetch alerts');
  return res.json();
}

export async function fetchLiveGraph() {
  const res = await fetch(`${API_BASE}/graph`);
  if (!res.ok) throw new Error('Failed to fetch graph data');
  return res.json();
}

/**
 * Fetches the hierarchical tree data: Server → Users → Events
 * This powers the D3 temporal tree visualization.
 */
export async function fetchHierarchicalGraph(upToTimestamp = null) {
  let url = `${API_BASE}/graph/hierarchical`;
  if (upToTimestamp) {
    const iso = typeof upToTimestamp === 'string' ? upToTimestamp : upToTimestamp.toISOString();
    url += `?up_to_timestamp=${encodeURIComponent(iso)}`;
  }
  const res = await fetch(url);
  if (!res.ok) throw new Error('Failed to fetch hierarchical graph');
  return res.json();
}

export async function fetchHistoricalState(timestamp) {
  const iso = typeof timestamp === 'string' ? timestamp : timestamp.toISOString();
  const res = await fetch(`${API_BASE}/history?timestamp=${encodeURIComponent(iso)}`);
  if (!res.ok) throw new Error('Failed to reconstruct historical state');
  return res.json();
}

/**
 * Resets the demo environment — wipes all events, alerts, sessions, resources.
 * Resets user statuses to baseline.
 */
export async function resetDemoEnvironment() {
  const res = await fetch(`${API_BASE}/reset`, { method: 'POST' });
  if (!res.ok) throw new Error('Failed to reset demo environment');
  return res.json();
}
