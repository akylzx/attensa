import { ipcMain } from 'electron';
import { sessionManager } from './tracker/session-manager.js';
import {
  getSessionById,
  getRecentSessions,
  getAllCompletedSessions,
  getActiveSession,
  getSessionEvents,
  getSessionContextBlocks,
  getMonthlySummary,
  getSessionsForMonth,
  updateSessionInsights,
  deleteSession,
} from './db/queries.js';
import { getSettings, setSetting } from './services/settings-store.js';
import { generateSessionInsights, generateMonthlyRecap } from './services/ai-client.js';

export function registerIpcHandlers() {
  // Session management
  ipcMain.handle('session:start', async (_event, plannedDurationMs: number) => {
    return sessionManager.startSession(plannedDurationMs);
  });

  ipcMain.handle('session:stop', async () => {
    return sessionManager.endSession();
  });

  ipcMain.handle('session:cancel', async () => {
    return sessionManager.cancelActiveSession();
  });

  ipcMain.handle('session:getActive', async () => {
    return getActiveSession();
  });

  ipcMain.handle('session:getById', async (_event, id: string) => {
    return getSessionById(id);
  });

  ipcMain.handle('session:getRecent', async (_event, limit: number = 5) => {
    return getRecentSessions(limit);
  });

  ipcMain.handle('session:getAll', async () => {
    return getAllCompletedSessions();
  });

  ipcMain.handle('session:delete', async (_event, id: string) => {
    deleteSession(id);
  });

  // AI Insights
  ipcMain.handle('insights:generate', async (_event, sessionId: string) => {
    const session = getSessionById(sessionId);
    if (!session) return null;

    // Check for cached insights
    if (session.aiInsightsJson) {
      try { return JSON.parse(session.aiInsightsJson); } catch {}
    }

    // Build data for AI
    const events = getSessionEvents(sessionId);
    const blocks = getSessionContextBlocks(sessionId);

    // Compute top apps from events
    const appTimeMap = new Map<string, number>();
    for (const ev of events) {
      if (!ev.isIdle) {
        appTimeMap.set(ev.appName, (appTimeMap.get(ev.appName) || 0) + ev.durationMs);
      }
    }
    const topApps = [...appTimeMap.entries()]
      .map(([appName, durationMs]) => ({ appName, durationMs }))
      .sort((a, b) => b.durationMs - a.durationMs)
      .slice(0, 10);

    // Build app switch sequence
    const appSwitches: Array<{ from: string; to: string; timestamp: number }> = [];
    for (let i = 1; i < events.length; i++) {
      if (!events[i].isIdle && !events[i - 1].isIdle && events[i].appName !== events[i - 1].appName) {
        appSwitches.push({
          from: events[i - 1].appName,
          to: events[i].appName,
          timestamp: events[i].timestamp,
        });
      }
    }

    const contextBlocksData = blocks.map((b) => ({
      clusterId: b.clusterId,
      durationMs: b.durationMs,
      appNames: JSON.parse(b.appNamesJson) as string[],
      wasInterrupted: !!b.wasInterrupted,
    }));

    const insights = await generateSessionInsights(
      {
        actualDurationMs: session.actualDurationMs,
        plannedDurationMs: session.plannedDurationMs,
        totalFocusTimeMs: session.totalFocusTimeMs,
        appSwitchCount: session.appSwitchCount,
        contextSwitchCount: session.contextSwitchCount,
        interruptionCount: session.interruptionCount,
        avgRecoveryTimeMs: session.avgRecoveryTimeMs,
        focusFragmentationScore: session.focusFragmentationScore,
        idleTimeMs: session.idleTimeMs,
      },
      contextBlocksData,
      topApps,
      appSwitches
    );

    // Cache the result
    if (insights) {
      updateSessionInsights(sessionId, JSON.stringify(insights));
    }

    return insights;
  });

  // Session metrics (detailed app data for timeline)
  ipcMain.handle('session:getMetrics', async (_event, sessionId: string) => {
    const events = getSessionEvents(sessionId);
    if (!events.length) return null;

    // Per-app time breakdown
    const appTimeMap = new Map<string, number>();
    for (const ev of events) {
      if (!ev.isIdle) {
        appTimeMap.set(ev.appName, (appTimeMap.get(ev.appName) || 0) + ev.durationMs);
      }
    }
    const appBreakdown = [...appTimeMap.entries()]
      .map(([appName, totalMs]) => ({ appName, totalMs }))
      .sort((a, b) => b.totalMs - a.totalMs);

    // App switch sequence with timestamps and duration
    const switches: Array<{ from: string; to: string; timestamp: number; durationInFrom: number }> = [];
    for (let i = 1; i < events.length; i++) {
      if (!events[i].isIdle && !events[i - 1].isIdle && events[i].appName !== events[i - 1].appName) {
        switches.push({
          from: events[i - 1].appName,
          to: events[i].appName,
          timestamp: events[i].timestamp,
          durationInFrom: events[i - 1].durationMs,
        });
      }
    }

    // Timeline events (all non-idle events in order)
    const timeline = events
      .filter((e) => !e.isIdle)
      .map((e) => ({
        appName: e.appName,
        timestamp: e.timestamp,
        durationMs: e.durationMs,
      }));

    return { appBreakdown, switches, timeline };
  });

  // Monthly Recap
  ipcMain.handle('recap:getMonthly', async (_event, yearMonth: string) => {
    return getMonthlySummary(yearMonth);
  });

  ipcMain.handle('recap:generate', async (_event, yearMonth: string) => {
    const sessions = getSessionsForMonth(yearMonth);
    if (!sessions.length) return null;

    const totalFocusTimeMs = sessions.reduce((sum, s) => sum + s.totalFocusTimeMs, 0);
    const avgFragmentationScore = sessions.reduce((sum, s) => sum + s.focusFragmentationScore, 0) / sessions.length;
    const avgRecoveryTimeMs = sessions.reduce((sum, s) => sum + s.avgRecoveryTimeMs, 0) / sessions.length;

    // Gather interruption sources from all sessions' context blocks
    const interruptionMap = new Map<string, number>();
    for (const session of sessions) {
      const blocks = getSessionContextBlocks(session.id);
      for (const b of blocks) {
        if (b.wasInterrupted) {
          const apps = JSON.parse(b.appNamesJson) as string[];
          for (const app of apps) {
            interruptionMap.set(app, (interruptionMap.get(app) || 0) + 1);
          }
        }
      }
    }
    const topInterruptionSources = [...interruptionMap.entries()]
      .map(([appName, count]) => ({ appName, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 5);

    // Weekly trend
    const weekMap = new Map<number, { total: number; count: number }>();
    for (const s of sessions) {
      const d = new Date(s.startedAt);
      const weekNum = Math.ceil(d.getDate() / 7);
      const entry = weekMap.get(weekNum) || { total: 0, count: 0 };
      entry.total += s.focusFragmentationScore;
      entry.count += 1;
      weekMap.set(weekNum, entry);
    }
    const weeklyTrend = [...weekMap.entries()]
      .map(([weekNumber, { total, count }]) => ({ weekNumber, avgScore: total / count }))
      .sort((a, b) => a.weekNumber - b.weekNumber);

    const recap = await generateMonthlyRecap(yearMonth, {
      totalSessions: sessions.length,
      totalFocusTimeMs,
      avgFragmentationScore,
      avgRecoveryTimeMs,
      topInterruptionSources,
      weeklyTrend,
    });

    return recap;
  });

  // Settings
  ipcMain.handle('settings:get', async () => {
    return getSettings();
  });

  ipcMain.handle('settings:set', async (_event, key: string, value: any) => {
    setSetting(key, value);
  });
}
