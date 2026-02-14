import {
  FRAGMENTATION_WEIGHTS,
  MAX_SWITCHES_PER_MINUTE,
  SHORT_STINT_THRESHOLD_MS,
} from '@attensa/shared';
import type { SessionMetrics } from '@attensa/shared';
import { calculateRecoveryTimes } from './recovery-detector.js';

interface EventInput {
  timestamp: number;
  appName: string;
  bundleId: string;
  durationMs: number;
  isIdle: boolean;
}

interface ContextBlockInput {
  clusterId: string;
  startTimestamp: number;
  endTimestamp: number;
  durationMs: number;
  wasInterrupted: boolean;
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

function calculateFragmentationScore(
  events: EventInput[],
  sessionDurationMs: number
): number {
  const nonIdleEvents = events.filter((e) => !e.isIdle);

  if (nonIdleEvents.length <= 1) return 0;

  const { switchFrequency, entropy, shortStintRatio } = FRAGMENTATION_WEIGHTS;

  // Signal 1: Switch Frequency
  const switchCount = nonIdleEvents.length - 1;
  const sessionMinutes = sessionDurationMs / 60000;
  const switchesPerMinute = sessionMinutes > 0 ? switchCount / sessionMinutes : 0;
  const switchFreqNorm = clamp(switchesPerMinute / MAX_SWITCHES_PER_MINUTE, 0, 1);

  // Signal 2: App Entropy (Shannon)
  const appDurations = new Map<string, number>();
  let totalDuration = 0;

  for (const event of nonIdleEvents) {
    const current = appDurations.get(event.bundleId) || 0;
    appDurations.set(event.bundleId, current + event.durationMs);
    totalDuration += event.durationMs;
  }

  let entropyValue = 0;
  if (totalDuration > 0) {
    for (const duration of appDurations.values()) {
      const proportion = duration / totalDuration;
      if (proportion > 0) {
        entropyValue -= proportion * Math.log2(proportion);
      }
    }
  }

  const maxEntropy = appDurations.size > 1 ? Math.log2(appDurations.size) : 1;
  const entropyNorm = maxEntropy > 0 ? entropyValue / maxEntropy : 0;

  // Signal 3: Short Stint Ratio
  const shortStints = nonIdleEvents.filter(
    (e) => e.durationMs < SHORT_STINT_THRESHOLD_MS
  );
  const shortStintRatioValue = shortStints.length / nonIdleEvents.length;

  // Combine
  const ffs =
    switchFrequency * switchFreqNorm +
    entropy * entropyNorm +
    shortStintRatio * shortStintRatioValue;

  return Math.round(ffs * 1000) / 1000;
}

export function calculateSessionMetrics(
  events: EventInput[],
  contextBlocks: ContextBlockInput[],
  sessionDurationMs: number
): SessionMetrics {
  const nonIdleEvents = events.filter((e) => !e.isIdle);
  const idleEvents = events.filter((e) => e.isIdle);

  // 1. Total Focus Time = session duration - idle time
  const totalIdleMs = idleEvents.reduce((sum, e) => sum + e.durationMs, 0);
  const totalFocusTimeMs = Math.max(0, sessionDurationMs - totalIdleMs);

  // 2. App Switch Count = unique bundleId transitions
  let appSwitchCount = 0;
  for (let i = 1; i < nonIdleEvents.length; i++) {
    if (nonIdleEvents[i].bundleId !== nonIdleEvents[i - 1].bundleId) {
      appSwitchCount++;
    }
  }

  // 3. Context Switch Count
  const contextSwitchCount = Math.max(0, contextBlocks.length - 1);

  // 4. Interruption Count
  const interruptionCount = contextBlocks.filter((b) => b.wasInterrupted).length;

  // 5. Recovery Time
  const recoveryTimes = calculateRecoveryTimes(events, contextBlocks);
  const avgRecoveryTimeMs =
    recoveryTimes.length > 0
      ? Math.round(
          recoveryTimes.reduce((sum, t) => sum + t, 0) / recoveryTimes.length
        )
      : 0;

  // 6. Fragmentation Score
  const focusFragmentationScore = calculateFragmentationScore(
    events,
    sessionDurationMs
  );

  return {
    totalFocusTimeMs,
    appSwitchCount,
    avgRecoveryTimeMs,
    focusFragmentationScore,
    interruptionCount,
    contextSwitchCount,
    idleTimeMs: totalIdleMs,
  };
}
