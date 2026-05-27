const BASE_MS = 500;
const MAX_MS = 30_000;

export function backoffDelay(attempts: number): number {
  const exp = Math.min(MAX_MS, BASE_MS * 2 ** Math.min(attempts, 10));
  const jitter = Math.random() * 500;
  return exp + jitter;
}
