import { powerMonitor } from 'electron';
import { v7 as uuidv7 } from 'uuid';
import { insertAppEventsBatch } from '../db/queries.js';
import {
  POLL_INTERVAL_MS,
  IDLE_THRESHOLD_SECONDS,
  BROWSER_TITLE_THROTTLE_MS,
  WRITE_BUFFER_FLUSH_MS,
  BROWSER_BUNDLE_IDS,
  BROWSER_EXE_NAMES,
  extractSiteName,
} from '@attensa/shared';
import { getActiveTabUrl, siteNameFromUrl } from './browser-tab-resolver.js';

interface PendingEvent {
  id: string;
  sessionId: string;
  timestamp: number;
  appName: string;
  windowTitle: string;
  bundleId: string;
  durationMs: number;
  isIdle: boolean;
}

// active-win result type
interface ActiveWinResult {
  title: string;
  owner: {
    name: string;
    processId: number;
    bundleId?: string;
    path: string;
  };
}

let activeWindowFn: (() => Promise<ActiveWinResult | undefined>) | null = null;

async function loadActiveWindow() {
  try {
    const mod = await import('active-win');
    activeWindowFn = mod.activeWindow ?? mod.default;
  } catch (err) {
    console.warn('Failed to load active-win:', err);
    activeWindowFn = null;
  }
}

export class WindowTracker {
  private sessionId: string | null = null;
  private intervalId: ReturnType<typeof setInterval> | null = null;
  private flushIntervalId: ReturnType<typeof setInterval> | null = null;
  private currentEvent: PendingEvent | null = null;
  private eventBuffer: PendingEvent[] = [];
  private lastBrowserTitleChange = 0;
  private appSwitchCount = 0;
  private currentApp = '';
  private polling = false;

  async initialize() {
    await loadActiveWindow();
  }

  start(sessionId: string) {
    this.sessionId = sessionId;
    this.currentEvent = null;
    this.eventBuffer = [];
    this.appSwitchCount = 0;
    this.currentApp = '';
    this.polling = false;

    this.intervalId = setInterval(() => this.poll(), POLL_INTERVAL_MS);
    this.flushIntervalId = setInterval(() => this.flush(), WRITE_BUFFER_FLUSH_MS);
  }

  stop(): { appSwitchCount: number } {
    if (this.intervalId) {
      clearInterval(this.intervalId);
      this.intervalId = null;
    }
    if (this.flushIntervalId) {
      clearInterval(this.flushIntervalId);
      this.flushIntervalId = null;
    }

    if (this.currentEvent) {
      this.finalizeEvent(this.currentEvent);
    }

    this.flush();

    const result = { appSwitchCount: this.appSwitchCount };
    this.sessionId = null;
    this.currentEvent = null;
    return result;
  }

  getCurrentApp(): string {
    return this.currentApp;
  }

  getAppSwitchCount(): number {
    return this.appSwitchCount;
  }

  private async poll() {
    if (!this.sessionId || !activeWindowFn || this.polling) return;
    this.polling = true;

    try {
      const now = Date.now();
      const idleSeconds = powerMonitor.getSystemIdleTime();

      // Handle idle state
      if (idleSeconds >= IDLE_THRESHOLD_SECONDS) {
        if (this.currentEvent && !this.currentEvent.isIdle) {
          this.finalizeEvent(this.currentEvent);
          this.currentEvent = {
            id: uuidv7(),
            sessionId: this.sessionId,
            timestamp: now,
            appName: 'Idle',
            windowTitle: '',
            bundleId: 'system.idle',
            durationMs: 0,
            isIdle: true,
          };
        }
        return;
      }

      // Returning from idle
      if (this.currentEvent?.isIdle) {
        this.finalizeEvent(this.currentEvent);
        this.currentEvent = null;
      }

      // Get active window (async call)
      const windowInfo = await activeWindowFn();
      if (!windowInfo) return;

      const rawAppName = windowInfo.owner.name || 'Unknown';
      const windowTitle = windowInfo.title || '';
      const bundleId = windowInfo.owner.bundleId
        || this.extractBundleId(windowInfo.owner.path || '');

      // For browsers, query the actual tab URL via AppleScript, fall back to title parsing
      const isBrowser = BROWSER_BUNDLE_IDS.has(bundleId) || BROWSER_EXE_NAMES.has(bundleId);
      let appName = rawAppName;
      if (isBrowser) {
        const tabUrl = await getActiveTabUrl(bundleId);
        const fromUrl = tabUrl ? siteNameFromUrl(tabUrl) : null;
        appName = fromUrl || extractSiteName(windowTitle, rawAppName);
      }

      this.currentApp = appName;

      // Determine if we should create a new event
      let shouldCreateNew = false;

      if (!this.currentEvent) {
        shouldCreateNew = true;
      } else if (this.currentEvent.bundleId !== bundleId) {
        // Different app entirely
        shouldCreateNew = true;
        this.appSwitchCount++;
      } else if (isBrowser) {
        // Same browser — compare raw window titles to detect tab/site changes
        // This catches changes even when two different pages extract to the same label
        if (this.currentEvent.windowTitle !== windowTitle && now - this.lastBrowserTitleChange >= BROWSER_TITLE_THROTTLE_MS) {
          shouldCreateNew = true;
          this.appSwitchCount++;
          this.lastBrowserTitleChange = now;
        }
      }

      if (shouldCreateNew) {
        if (this.currentEvent) {
          this.finalizeEvent(this.currentEvent);
        }
        this.currentEvent = {
          id: uuidv7(),
          sessionId: this.sessionId,
          timestamp: now,
          appName,
          windowTitle,
          bundleId,
          durationMs: 0,
          isIdle: false,
        };
      }
    } catch (err) {
      // Silently handle polling errors (e.g., permission denied)
      console.error('Window poll error:', err);
    } finally {
      this.polling = false;
    }
  }

  private finalizeEvent(event: PendingEvent) {
    event.durationMs = Date.now() - event.timestamp;
    this.eventBuffer.push({ ...event });
  }

  private flush() {
    if (this.eventBuffer.length === 0) return;
    const batch = this.eventBuffer.splice(0);
    try {
      insertAppEventsBatch(batch);
    } catch (err) {
      console.error('Failed to flush events to SQLite:', err);
      this.eventBuffer.unshift(...batch);
    }
  }

  private extractBundleId(appPath: string): string {
    if (!appPath) return 'unknown';

    if (process.platform === 'darwin') {
      const match = appPath.match(/\/([^/]+)\.app/);
      if (match) {
        return match[1].toLowerCase().replace(/\s+/g, '.');
      }
    }

    if (process.platform === 'win32') {
      const match = appPath.match(/([^\\]+)$/);
      if (match) return match[1];
    }

    return appPath;
  }
}

export const windowTracker = new WindowTracker();
