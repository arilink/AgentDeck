export function formatElapsed(ms: number): string {
  if (!Number.isFinite(ms) || ms < 0) return '00:00';
  const total = Math.floor(ms / 1000);
  const mm = Math.floor(total / 60);
  const ss = total % 60;
  const m = mm < 100 ? String(mm).padStart(2, '0') : String(mm);
  return `${m}:${String(ss).padStart(2, '0')}`;
}
