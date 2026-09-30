/**
 * Date and Time utilities for local time synchronization.
 * Normalizes ISO strings from backend (ensuring UTC interpretation) and
 * formats timestamps in the user's active local timezone.
 */

export function parseIsoDate(iso) {
  if (!iso) return null;
  if (iso instanceof Date) return iso;
  const str = String(iso).trim();
  // If string has no timezone designator (no 'Z' and no +/- offset), treat as UTC
  const hasTz = str.endsWith('Z') || /[+-]\d{2}:?\d{2}$/.test(str);
  return new Date(hasTz ? str : str + 'Z');
}

export function formatLocalTime(iso) {
  if (!iso) return '—';
  try {
    const d = parseIsoDate(iso);
    return d ? d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' }) : String(iso);
  } catch {
    return String(iso);
  }
}

export function formatLocalDateTime(iso) {
  if (!iso) return '—';
  try {
    const d = parseIsoDate(iso);
    return d ? d.toLocaleString([], {
      month: 'short', day: '2-digit',
      hour: '2-digit', minute: '2-digit', second: '2-digit'
    }) : String(iso);
  } catch {
    return String(iso);
  }
}
