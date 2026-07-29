const UNIT_MS = { s: 1000, m: 60_000, h: 3_600_000, d: 86_400_000 };

// Parses simple durations like "15m", "7d", "1h" into a future Date.
export const durationFromNow = (duration) => {
  const match = /^(\d+)(s|m|h|d)$/.exec(duration.trim());
  if (!match) {
    throw new Error(`Unsupported duration format: ${duration}`);
  }
  const [, amount, unit] = match;
  return new Date(Date.now() + Number(amount) * UNIT_MS[unit]);
};
