export const POLL_INTERVAL_MS = 1000;
export const IDLE_THRESHOLD_SECONDS = 30;
export const LONG_IDLE_THRESHOLD_MS = 120_000;
export const STABLE_ACTIVITY_THRESHOLD_MS = 15_000;
export const SHORT_STINT_THRESHOLD_MS = 10_000;
export const MAX_SWITCHES_PER_MINUTE = 6.0;
export const BROWSER_TITLE_THROTTLE_MS = 5_000;
export const WRITE_BUFFER_FLUSH_MS = 10_000;

export const DURATION_OPTIONS = [
  { label: 'Short Sprint', minutes: 25, ms: 25 * 60 * 1000 },
  { label: 'Deep Work', minutes: 50, ms: 50 * 60 * 1000 },
  { label: 'Extended Flow', minutes: 90, ms: 90 * 60 * 1000 },
] as const;

export const FRAGMENTATION_WEIGHTS = {
  switchFrequency: 0.4,
  entropy: 0.3,
  shortStintRatio: 0.3,
} as const;
