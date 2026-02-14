import { BrowserWindow } from 'electron';
import { v7 as uuidv7 } from 'uuid';
import { windowTracker } from './window-tracker.js';
import {
  createSession,
  completeSession,
  cancelSession as cancelSessionDb,
  getSessionEvents,
} from '../db/queries.js';
import { calculateSessionMetrics } from '../analytics/metrics-calculator.js';
import { groupEventsIntoContextBlocks } from '../analytics/context-grouper.js';
import { insertContextBlocks } from '../db/queries.js';
import { getMainWindow } from '../index.js';

class SessionManager {
  private activeSessionId: string | null = null;
  private plannedDurationMs = 0;
  private startTime = 0;
  private tickInterval: ReturnType<typeof setInterval> | null = null;
  private timerTimeout: ReturnType<typeof setTimeout> | null = null;

  async startSession(plannedDurationMs: number): Promise<string> {
    if (this.activeSessionId) {
      throw new Error('A session is already active');
    }

    const sessionId = uuidv7();
    const now = Date.now();

    createSession({
      id: sessionId,
      startedAt: now,
      plannedDurationMs,
    });

    this.activeSessionId = sessionId;
    this.plannedDurationMs = plannedDurationMs;
    this.startTime = now;

    // Start tracking
    await windowTracker.initialize();
    windowTracker.start(sessionId);

    // Send tick updates to renderer every second
    this.tickInterval = setInterval(() => {
      const win = getMainWindow();
      if (!win) return;

      const elapsed = Date.now() - this.startTime;
      const remainingMs = Math.max(0, this.plannedDurationMs - elapsed);

      win.webContents.send('session:tick', {
        remainingMs,
        appSwitchCount: windowTracker.getAppSwitchCount(),
        currentApp: windowTracker.getCurrentApp(),
      });
    }, 1000);

    // Auto-end when timer expires (safety net — renderer also triggers stop on remainingMs=0)
    this.timerTimeout = setTimeout(async () => {
      try {
        await this.endSession();
      } catch (err) {
        console.error('Auto-end session failed:', err);
        // Fallback: at minimum mark the session as completed so it's not lost
        if (this.activeSessionId) {
          try {
            windowTracker.stop();
            completeSession(this.activeSessionId, {
              endedAt: Date.now(),
              actualDurationMs: Date.now() - this.startTime,
              totalFocusTimeMs: Math.max(0, Date.now() - this.startTime),
              appSwitchCount: 0,
              avgRecoveryTimeMs: 0,
              focusFragmentationScore: 0,
              interruptionCount: 0,
              contextSwitchCount: 0,
              idleTimeMs: 0,
            });
            const win = getMainWindow();
            if (win) {
              win.webContents.send('session:end', this.activeSessionId);
            }
          } catch (fallbackErr) {
            console.error('Fallback session save also failed:', fallbackErr);
          }
          this.activeSessionId = null;
          this.plannedDurationMs = 0;
          this.startTime = 0;
        }
      }
    }, plannedDurationMs);

    return sessionId;
  }

  async endSession(): Promise<string | null> {
    if (!this.activeSessionId) return null;

    const sessionId = this.activeSessionId;
    this.clearTimers();

    // Stop tracking
    windowTracker.stop();

    // Calculate metrics
    const now = Date.now();
    const events = getSessionEvents(sessionId);

    // Group events into context blocks
    const contextBlockData = groupEventsIntoContextBlocks(
      events.map((e) => ({
        ...e,
        isIdle: Boolean(e.isIdle),
      }))
    );

    // Save context blocks
    insertContextBlocks(
      contextBlockData.map((block) => ({
        id: uuidv7(),
        sessionId,
        clusterId: block.clusterId,
        startTimestamp: block.startTimestamp,
        endTimestamp: block.endTimestamp,
        durationMs: block.durationMs,
        appNamesJson: JSON.stringify(block.appNames),
        eventCount: block.eventCount,
        wasInterrupted: block.wasInterrupted,
      }))
    );

    // Calculate and save metrics
    const metrics = calculateSessionMetrics(
      events.map((e) => ({ ...e, isIdle: Boolean(e.isIdle) })),
      contextBlockData,
      now - this.startTime
    );

    completeSession(sessionId, {
      endedAt: now,
      actualDurationMs: now - this.startTime,
      ...metrics,
    });

    // Notify renderer
    const win = getMainWindow();
    if (win) {
      win.webContents.send('session:end', sessionId);
    }

    this.activeSessionId = null;
    this.plannedDurationMs = 0;
    this.startTime = 0;

    return sessionId;
  }

  async cancelActiveSession(): Promise<void> {
    if (!this.activeSessionId) return;

    const sessionId = this.activeSessionId;
    this.clearTimers();
    windowTracker.stop();
    cancelSessionDb(sessionId);

    this.activeSessionId = null;
    this.plannedDurationMs = 0;
    this.startTime = 0;
  }

  getActiveSessionId(): string | null {
    return this.activeSessionId;
  }

  isActive(): boolean {
    return this.activeSessionId !== null;
  }

  private clearTimers() {
    if (this.tickInterval) {
      clearInterval(this.tickInterval);
      this.tickInterval = null;
    }
    if (this.timerTimeout) {
      clearTimeout(this.timerTimeout);
      this.timerTimeout = null;
    }
  }
}

export const sessionManager = new SessionManager();
