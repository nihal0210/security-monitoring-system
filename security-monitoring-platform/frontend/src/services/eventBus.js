/**
 * Enterprise Cross-Tab Telemetry Event Bus
 *
 * Enables seamless real-time inter-tab synchronization between:
 * - Link 1: Operations Dashboard (Threat Ops & Module Downtime Optimizer)
 * - Link 2: Scenario & Module Activity Simulator
 *
 * Uses BroadcastChannel with fallback to localStorage storage events,
 * allowing live interactive demonstrations across tabs or windows
 * without requiring any local backend to be running on the presentation computer!
 */

const CHANNEL_NAME = 'sec_monitor_telemetry_channel_v1';
let channel = null;

try {
  if (typeof window !== 'undefined' && 'BroadcastChannel' in window) {
    channel = new BroadcastChannel(CHANNEL_NAME);
  }
} catch (e) {
  console.warn('[EventBus] BroadcastChannel not supported; relying on storage events', e);
}

export function broadcastTelemetry(type, data) {
  const message = {
    type,
    data,
    timestamp: new Date().toISOString(),
    id: 'TX-' + Math.random().toString(36).substring(2, 9)
  };

  // 1. BroadcastChannel (modern browsers, instantaneous)
  if (channel) {
    try {
      channel.postMessage(message);
    } catch (e) {
      console.warn('[EventBus] Channel post failed', e);
    }
  }

  // 2. LocalStorage event fallback (fires on other tabs)
  try {
    localStorage.setItem('sec_monitor_last_telemetry', JSON.stringify(message));
  } catch (e) {
    // Storage quota or private mode
  }

  // Also dispatch a local CustomEvent for current window listeners
  try {
    window.dispatchEvent(new CustomEvent('sec_monitor_local_event', { detail: message }));
  } catch (e) {}

  return message;
}

export function subscribeTelemetry(handler) {
  if (typeof window === 'undefined') return () => {};

  const onChannelMsg = (event) => {
    if (event.data) {
      handler(event.data);
    }
  };

  const onStorageMsg = (event) => {
    if (event.key === 'sec_monitor_last_telemetry' && event.newValue) {
      try {
        const parsed = JSON.parse(event.newValue);
        handler(parsed);
      } catch (e) {}
    }
  };

  const onLocalMsg = (event) => {
    if (event.detail) {
      handler(event.detail);
    }
  };

  if (channel) {
    channel.addEventListener('message', onChannelMsg);
  }
  window.addEventListener('storage', onStorageMsg);
  window.addEventListener('sec_monitor_local_event', onLocalMsg);

  return () => {
    if (channel) channel.removeEventListener('message', onChannelMsg);
    window.removeEventListener('storage', onStorageMsg);
    window.removeEventListener('sec_monitor_local_event', onLocalMsg);
  };
}
