import { v7 as uuidv7 } from 'uuid';
import {
  DEFAULT_CLUSTERS,
  BROWSER_BUNDLE_IDS,
  BROWSER_EXE_NAMES,
  DEV_TITLE_PATTERNS,
  ENTERTAINMENT_TITLE_PATTERNS,
  COMPATIBLE_CLUSTERS,
  LONG_IDLE_THRESHOLD_MS,
} from '@attensa/shared';
import type { AppCluster } from '@attensa/shared';

interface EventInput {
  id: string;
  sessionId: string;
  timestamp: number;
  appName: string;
  windowTitle: string;
  bundleId: string;
  durationMs: number;
  isIdle: boolean;
}

interface ContextBlockResult {
  clusterId: string;
  startTimestamp: number;
  endTimestamp: number;
  durationMs: number;
  appNames: string[];
  eventCount: number;
  wasInterrupted: boolean;
}

// Build lookup tables for fast cluster resolution
function buildClusterLookup(clusters: AppCluster[]) {
  const byBundleId = new Map<string, string>();
  const byExeName = new Map<string, string>();

  for (const cluster of clusters) {
    for (const bid of cluster.bundleIds) {
      byBundleId.set(bid, cluster.id);
    }
    for (const exe of cluster.exeNames) {
      byExeName.set(exe.toLowerCase(), cluster.id);
    }
  }

  return { byBundleId, byExeName };
}

function isBrowser(bundleId: string): boolean {
  return BROWSER_BUNDLE_IDS.has(bundleId) || BROWSER_EXE_NAMES.has(bundleId);
}

function disambiguateBrowserContext(windowTitle: string): string {
  const titleLower = windowTitle.toLowerCase();

  for (const pattern of ENTERTAINMENT_TITLE_PATTERNS) {
    if (titleLower.includes(pattern.toLowerCase())) {
      return 'entertainment';
    }
  }

  for (const pattern of DEV_TITLE_PATTERNS) {
    if (titleLower.includes(pattern.toLowerCase())) {
      return 'browser-dev';
    }
  }

  return 'browser-general';
}

function resolveCluster(
  event: EventInput,
  lookup: ReturnType<typeof buildClusterLookup>,
  clusters: AppCluster[]
): string | null {
  // 1. Exact bundleId match
  const byBundle = lookup.byBundleId.get(event.bundleId);
  if (byBundle !== undefined) {
    if (isBrowser(event.bundleId)) {
      return disambiguateBrowserContext(event.windowTitle);
    }
    return byBundle;
  }

  // 2. Exact exe name match (Windows)
  const byExe = lookup.byExeName.get(event.bundleId.toLowerCase());
  if (byExe !== undefined) {
    return byExe;
  }

  // 3. App name pattern match
  const appNameLower = event.appName.toLowerCase();
  for (const cluster of clusters) {
    for (const pattern of cluster.appNamePatterns) {
      if (appNameLower.includes(pattern.toLowerCase())) {
        if (isBrowser(event.bundleId)) {
          return disambiguateBrowserContext(event.windowTitle);
        }
        return cluster.id;
      }
    }
  }

  return null;
}

function isCompatible(currentClusterId: string, newClusterId: string): boolean {
  if (currentClusterId === newClusterId) return true;
  const compatible = COMPATIBLE_CLUSTERS[currentClusterId];
  return compatible ? compatible.includes(newClusterId) : false;
}

function getCategoryForCluster(clusterId: string, clusters: AppCluster[]): string | undefined {
  // Handle synthetic cluster IDs
  if (clusterId === 'entertainment') return 'entertainment';
  if (clusterId === 'browser-dev' || clusterId === 'browser-general') return 'productive';
  return clusters.find((c) => c.id === clusterId)?.category;
}

export function groupEventsIntoContextBlocks(
  events: EventInput[],
  clusters: AppCluster[] = DEFAULT_CLUSTERS
): ContextBlockResult[] {
  if (events.length === 0) return [];

  const lookup = buildClusterLookup(clusters);
  const blocks: ContextBlockResult[] = [];
  let currentBlock: ContextBlockResult | null = null;

  const sorted = [...events].sort((a, b) => a.timestamp - b.timestamp);

  for (const event of sorted) {
    // Skip idle events (but long idles break context)
    if (event.isIdle) {
      if (event.durationMs > LONG_IDLE_THRESHOLD_MS && currentBlock) {
        currentBlock.endTimestamp = event.timestamp;
        currentBlock.durationMs = currentBlock.endTimestamp - currentBlock.startTimestamp;
        blocks.push(currentBlock);
        currentBlock = null;
      }
      continue;
    }

    const clusterId = resolveCluster(event, lookup, clusters);

    if (clusterId === null) {
      // Unknown app — treat as interruption
      if (currentBlock) {
        currentBlock.wasInterrupted = true;
        currentBlock.endTimestamp = event.timestamp;
        currentBlock.durationMs = currentBlock.endTimestamp - currentBlock.startTimestamp;
        blocks.push(currentBlock);
        currentBlock = null;
      }
      continue;
    }

    if (currentBlock === null) {
      // Start new block
      currentBlock = {
        clusterId,
        startTimestamp: event.timestamp,
        endTimestamp: event.timestamp + event.durationMs,
        durationMs: 0,
        appNames: [event.appName],
        eventCount: 1,
        wasInterrupted: false,
      };
    } else if (isCompatible(currentBlock.clusterId, clusterId)) {
      // Extend current block
      if (!currentBlock.appNames.includes(event.appName)) {
        currentBlock.appNames.push(event.appName);
      }
      currentBlock.eventCount++;
      currentBlock.endTimestamp = event.timestamp + event.durationMs;
    } else {
      // Context switch
      const newCategory = getCategoryForCluster(clusterId, clusters);
      if (newCategory === 'entertainment' || newCategory === 'communication') {
        currentBlock.wasInterrupted = true;
      }

      currentBlock.endTimestamp = event.timestamp;
      currentBlock.durationMs = currentBlock.endTimestamp - currentBlock.startTimestamp;
      blocks.push(currentBlock);

      currentBlock = {
        clusterId,
        startTimestamp: event.timestamp,
        endTimestamp: event.timestamp + event.durationMs,
        durationMs: 0,
        appNames: [event.appName],
        eventCount: 1,
        wasInterrupted: false,
      };
    }
  }

  // Finalize last block
  if (currentBlock) {
    currentBlock.durationMs = currentBlock.endTimestamp - currentBlock.startTimestamp;
    blocks.push(currentBlock);
  }

  return blocks;
}
