const WINDOW_MS = 60_000;
const MAX_WRITES = 10;
const MAX_READS = 30;

const buckets = new Map<string, number[]>();

function prune(timestamps: number[], now: number): number[] {
  const cutoff = now - WINDOW_MS;
  return timestamps.filter((t) => t > cutoff);
}

export function checkRateLimit(
  sessionKey: string,
  type: "read" | "write"
): { allowed: boolean; retryAfterMs?: number } {
  const now = Date.now();
  const key = `${sessionKey}:${type}`;
  const max = type === "write" ? MAX_WRITES : MAX_READS;

  const timestamps = prune(buckets.get(key) ?? [], now);

  if (timestamps.length >= max) {
    const oldest = timestamps[0] ?? now;
    return { allowed: false, retryAfterMs: oldest + WINDOW_MS - now };
  }

  timestamps.push(now);
  buckets.set(key, timestamps);
  return { allowed: true };
}
