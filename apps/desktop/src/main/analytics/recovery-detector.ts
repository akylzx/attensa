import { STABLE_ACTIVITY_THRESHOLD_MS, COMPATIBLE_CLUSTERS } from '@attensa/shared';

interface ContextBlockInput {
  clusterId: string;
  startTimestamp: number;
  endTimestamp: number;
  durationMs: number;
  wasInterrupted: boolean;
}

interface EventInput {
  timestamp: number;
  durationMs: number;
  bundleId: string;
  isIdle: boolean;
}

function isCompatible(clusterA: string, clusterB: string): boolean {
  if (clusterA === clusterB) return true;
  const compat = COMPATIBLE_CLUSTERS[clusterA];
  return compat ? compat.includes(clusterB) : false;
}

export function calculateRecoveryTimes(
  events: EventInput[],
  contextBlocks: ContextBlockInput[]
): number[] {
  const recoveryTimes: number[] = [];

  for (let i = 0; i < contextBlocks.length - 2; i++) {
    const blockA = contextBlocks[i];

    if (!blockA.wasInterrupted) continue;

    // blockB is the interrupting block
    const blockB = contextBlocks[i + 1];

    // Find first return to compatible context
    let returnBlock: ContextBlockInput | null = null;
    for (let j = i + 2; j < contextBlocks.length; j++) {
      if (isCompatible(blockA.clusterId, contextBlocks[j].clusterId)) {
        returnBlock = contextBlocks[j];
        break;
      }
    }

    if (!returnBlock) continue;

    // Find events within the return block
    const returnEvents = events.filter(
      (e) =>
        e.timestamp >= returnBlock!.startTimestamp &&
        e.timestamp <= returnBlock!.endTimestamp &&
        !e.isIdle
    ).sort((a, b) => a.timestamp - b.timestamp);

    // Find first moment of stable activity
    let consecutiveMs = 0;
    let stableStart: number | null = null;
    let lastEndTime: number | null = null;

    for (const event of returnEvents) {
      if (lastEndTime === null || event.timestamp - lastEndTime > 2000) {
        consecutiveMs = event.durationMs;
        stableStart = event.timestamp;
      } else {
        consecutiveMs += event.durationMs;
      }

      if (consecutiveMs >= STABLE_ACTIVITY_THRESHOLD_MS && stableStart !== null) {
        const recoveryTime = stableStart - blockB.endTimestamp;
        recoveryTimes.push(Math.max(0, recoveryTime));
        break;
      }

      lastEndTime = event.timestamp + event.durationMs;
    }
  }

  return recoveryTimes;
}
