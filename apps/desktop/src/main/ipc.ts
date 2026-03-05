import { ipcMain } from 'electron';
import { v7 as uuidv7 } from 'uuid';
import { SELF_APP_NAMES } from '@attensa/shared';
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
  upsertMonthlySummary,
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

    // Compute top apps from events (exclude self-app)
    const appTimeMap = new Map<string, number>();
    for (const ev of events) {
      if (!ev.isIdle && !SELF_APP_NAMES.has(ev.appName)) {
        appTimeMap.set(ev.appName, (appTimeMap.get(ev.appName) || 0) + ev.durationMs);
      }
    }
    const topApps = [...appTimeMap.entries()]
      .map(([appName, durationMs]) => ({ appName, durationMs }))
      .sort((a, b) => b.durationMs - a.durationMs)
      .slice(0, 10);

    // Build app switch sequence (exclude self-app)
    const appSwitches: Array<{ from: string; to: string; timestamp: number }> = [];
    for (let i = 1; i < events.length; i++) {
      if (!events[i].isIdle && !events[i - 1].isIdle && events[i].appName !== events[i - 1].appName
        && !SELF_APP_NAMES.has(events[i].appName) && !SELF_APP_NAMES.has(events[i - 1].appName)) {
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

    const isSelf = (name: string) => SELF_APP_NAMES.has(name);

    // Per-app time breakdown (exclude self-app)
    const appTimeMap = new Map<string, number>();
    for (const ev of events) {
      if (!ev.isIdle && !isSelf(ev.appName)) {
        appTimeMap.set(ev.appName, (appTimeMap.get(ev.appName) || 0) + ev.durationMs);
      }
    }
    const appBreakdown = [...appTimeMap.entries()]
      .map(([appName, totalMs]) => ({ appName, totalMs }))
      .sort((a, b) => b.totalMs - a.totalMs);

    // App switch sequence with timestamps and duration (exclude self-app)
    const switches: Array<{ from: string; to: string; timestamp: number; durationInFrom: number }> = [];
    for (let i = 1; i < events.length; i++) {
      if (!events[i].isIdle && !events[i - 1].isIdle
        && events[i].appName !== events[i - 1].appName
        && !isSelf(events[i].appName) && !isSelf(events[i - 1].appName)) {
        switches.push({
          from: events[i - 1].appName,
          to: events[i].appName,
          timestamp: events[i].timestamp,
          durationInFrom: events[i - 1].durationMs,
        });
      }
    }

    // Timeline events (all non-idle, non-self events in order)
    const timeline = events
      .filter((e) => !e.isIdle && !isSelf(e.appName))
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
    const monthSessions = getSessionsForMonth(yearMonth);
    if (!monthSessions.length) return null;

    const sessionCount = monthSessions.length;
    const totalFocusTimeMs = monthSessions.reduce((sum, s) => sum + s.totalFocusTimeMs, 0);
    const avgFocusTimePerSessionMs = totalFocusTimeMs / sessionCount;
    const avgFragmentationScore = monthSessions.reduce((sum, s) => sum + s.focusFragmentationScore, 0) / sessionCount;
    const avgRecoveryTimeMs = monthSessions.reduce((sum, s) => sum + s.avgRecoveryTimeMs, 0) / sessionCount;
    const avgAppSwitchesPerSession = monthSessions.reduce((sum, s) => sum + s.appSwitchCount, 0) / sessionCount;
    const totalInterruptions = monthSessions.reduce((sum, s) => sum + s.interruptionCount, 0);

    // Top apps across all sessions
    const appTotalMap = new Map<string, number>();
    for (const s of monthSessions) {
      const events = getSessionEvents(s.id);
      for (const ev of events) {
        if (!ev.isIdle && !SELF_APP_NAMES.has(ev.appName)) {
          appTotalMap.set(ev.appName, (appTotalMap.get(ev.appName) || 0) + ev.durationMs);
        }
      }
    }
    const topApps = [...appTotalMap.entries()]
      .map(([appName, durationMs]) => ({ appName, durationMs }))
      .sort((a, b) => b.durationMs - a.durationMs)
      .slice(0, 10);

    // Gather interruption sources from all sessions' context blocks
    const interruptionMap = new Map<string, number>();
    for (const session of monthSessions) {
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
    for (const s of monthSessions) {
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

    // Generate AI recap
    const aiRecap = await generateMonthlyRecap(yearMonth, {
      totalSessions: sessionCount,
      totalFocusTimeMs,
      avgFragmentationScore,
      avgRecoveryTimeMs,
      topInterruptionSources,
      weeklyTrend,
    });

    // Persist to DB
    const summaryData = {
      id: uuidv7(),
      yearMonth,
      generatedAt: Date.now(),
      sessionCount,
      totalFocusTimeMs,
      avgFocusTimePerSessionMs: Math.round(avgFocusTimePerSessionMs),
      avgAppSwitchesPerSession: Math.round(avgAppSwitchesPerSession),
      avgRecoveryTimeMs: Math.round(avgRecoveryTimeMs),
      avgFragmentationScore,
      totalInterruptions,
      topAppsJson: JSON.stringify(topApps),
      topInterruptionSourcesJson: JSON.stringify(topInterruptionSources),
      focusTrendJson: JSON.stringify(weeklyTrend),
      aiRecapJson: aiRecap ? JSON.stringify(aiRecap) : null,
    };

    upsertMonthlySummary(summaryData);

    // Return the summary in the same shape as getMonthlySummary
    return {
      ...summaryData,
      avgFragmentationScore: Math.round(avgFragmentationScore * 1000),
    };
  });

  // Settings
  ipcMain.handle('settings:get', async () => {
    return getSettings();
  });

  ipcMain.handle('settings:set', async (_event, key: string, value: any) => {
    setSetting(key, value);
  });
}
