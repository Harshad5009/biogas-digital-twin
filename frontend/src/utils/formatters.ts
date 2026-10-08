// utils/formatters.ts — Safe timezone-aware timestamp and metric formatters

/**
 * Parses an ISO timestamp string safely.
 * If the string does not have a timezone indicator ('Z' or offset '+/-HH:MM'),
 * it treats it as UTC (since backend stores records in UTC).
 */
export function parseUtcDate(isoStr?: string | null): Date | null {
  if (!isoStr) return null;
  let s = isoStr.trim();
  // If no timezone offset is present, append 'Z' to treat as UTC
  if (!s.endsWith('Z') && !/[+-]\d{2}:?\d{2}$/.test(s)) {
    s += 'Z';
  }
  const d = new Date(s);
  return isNaN(d.getTime()) ? null : d;
}

/**
 * Formats a timestamp into the user's local date and time string.
 * Example: "10/9/2026, 12:38:07 AM"
 */
export function formatDateTime(isoStr?: string | null): string {
  const d = parseUtcDate(isoStr);
  return d ? d.toLocaleString() : '—';
}

/**
 * Formats a timestamp into local time string.
 * Example: "12:38 AM" or "12:38:07 AM"
 */
export function formatTime(isoStr?: string | null, includeSeconds = false): string {
  const d = parseUtcDate(isoStr);
  if (!d) return '—';
  return d.toLocaleTimeString([], {
    hour: '2-digit',
    minute: '2-digit',
    ...(includeSeconds ? { second: '2-digit' } : {}),
  });
}
