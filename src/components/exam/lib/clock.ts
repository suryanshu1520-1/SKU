export function serverOffsetMs(serverNowIso: string, clientNowMs: number): number {
  return Date.parse(serverNowIso) - clientNowMs;
}

export function msLeft(deadlineIso: string, clientNowMs: number, offsetMs: number): number {
  return Date.parse(deadlineIso) - (clientNowMs + offsetMs);
}

export function secondsLeft(deadlineIso: string, clientNowMs: number, offsetMs: number): number {
  return Math.max(0, Math.ceil(msLeft(deadlineIso, clientNowMs, offsetMs) / 1000));
}

export function secondsElapsed(
  startedIso: string,
  clientNowMs: number,
  offsetMs: number,
  durationSeconds: number
): number {
  const elapsedMs = clientNowMs + offsetMs - Date.parse(startedIso);
  const elapsedSec = Math.floor(elapsedMs / 1000);
  return Math.max(0, Math.min(elapsedSec, durationSeconds));
}

export function formatTimeLeft(seconds: number): string {
  const s = Math.max(0, Math.floor(seconds));
  const hours = Math.floor(s / 3600);
  const minutes = Math.floor((s % 3600) / 60);
  const secs = s % 60;
  if (hours > 0) {
    return `${hours}:${String(minutes).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
  }
  return `${String(minutes).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
}

export function hallClockAtMinute(minute: number): string {
  const startTotalMin = 9 * 60 + 30; // 570 minutes (09:30)
  const totalMin = startTotalMin + minute;
  const h = Math.floor(totalMin / 60) % 24;
  const m = totalMin % 60;
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
}

export function hallClock(elapsedSeconds: number): string {
  return hallClockAtMinute(Math.floor(elapsedSeconds / 60));
}

export function hallEnd(durationSeconds: number): string {
  return hallClock(durationSeconds);
}

export function formatMarks(hundredths: number): string {
  const a = Math.abs(hundredths);
  const formatted = `${Math.floor(a / 100)}.${String(a % 100).padStart(2, '0')}`;
  return hundredths < 0 ? `−${formatted}` : formatted;
}

export function formatSignedMarks(hundredths: number): string {
  if (hundredths > 0) {
    return `+${formatMarks(hundredths)}`;
  }
  return formatMarks(hundredths);
}

export function formatDuration(seconds: number): string {
  const s = Math.max(0, Math.floor(seconds));
  if (s < 60) {
    return `${s}s`;
  }
  if (s < 3600) {
    const m = Math.floor(s / 60);
    const rem = s % 60;
    return `${m}m ${rem}s`;
  }
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  return `${h}h ${String(m).padStart(2, '0')}m`;
}

export function durationLabel(seconds: number): string {
  if (seconds === 7200) return '2 hours';
  if (seconds === 3600) return '1 hour';
  const minutes = Math.floor(seconds / 60);
  return `${minutes} minutes`;
}

export function rollNumber(userId: string): string {
  let h = 0x811c9dc5;
  for (let i = 0; i < userId.length; i++) {
    h ^= userId.charCodeAt(i);
    h = Math.imul(h, 0x01000193) >>> 0;
  }
  const num = h % 10000000;
  return `TK${String(num).padStart(7, '0')}`;
}

export function formatPercent(numerator: number, denominator: number): string {
  if (denominator === 0) return '—';
  return `${Math.round((100 * numerator) / denominator)}%`;
}
