import { eq, desc, and, gte, lt } from 'drizzle-orm';
import { getDb } from './connection.js';
import { sessions, appEvents, contextBlocks, monthlySummaries } from './schema.js';
import type { AppEvent, ContextBlock } from '@attensa/shared';

// Sessions
export function createSession(data: {
  id: string;
  startedAt: number;
  plannedDurationMs: number;
}) {
  const db = getDb();
  return db.insert(sessions).values({
    id: data.id,
    startedAt: data.startedAt,
    plannedDurationMs: data.plannedDurationMs,
    status: 'active',
  }).run();
}

export function completeSession(id: string, metrics: {
  endedAt: number;
  actualDurationMs: number;
  totalFocusTimeMs: number;
  appSwitchCount: number;
  avgRecoveryTimeMs: number;
  focusFragmentationScore: number;
  interruptionCount: number;
  contextSwitchCount: number;
  idleTimeMs: number;
}) {
  const db = getDb();
  return db.update(sessions)
    .set({
      ...metrics,
      // Store fragmentation as integer 0-1000 for SQLite
      focusFragmentationScore: Math.round(metrics.focusFragmentationScore * 1000),
      status: 'completed',
    })
    .where(eq(sessions.id, id))
    .run();
}

export function cancelSession(id: string) {
  const db = getDb();
  return db.update(sessions)
    .set({ status: 'cancelled', endedAt: Date.now() })
    .where(eq(sessions.id, id))
    .run();
}

export function getSessionById(id: string) {
  const db = getDb();
  const row = db.select().from(sessions).where(eq(sessions.id, id)).get();
  if (!row) return null;
  return {
    ...row,
    focusFragmentationScore: row.focusFragmentationScore / 1000,
  };
}

export function getRecentSessions(limit: number = 5) {
  const db = getDb();
  const rows = db.select().from(sessions)
    .where(eq(sessions.status, 'completed'))
    .orderBy(desc(sessions.startedAt))
    .limit(limit)
    .all();
  return rows.map((row) => ({
    ...row,
    focusFragmentationScore: row.focusFragmentationScore / 1000,
  }));
}

export function getAllCompletedSessions() {
  const db = getDb();
  const rows = db.select().from(sessions)
    .where(eq(sessions.status, 'completed'))
    .orderBy(sessions.startedAt)
    .all();
  return rows.map((row) => ({
    ...row,
    focusFragmentationScore: row.focusFragmentationScore / 1000,
  }));
}

export function getActiveSession() {
  const db = getDb();
  const row = db.select().from(sessions)
    .where(eq(sessions.status, 'active'))
    .get();
  if (!row) return null;
  return {
    ...row,
    focusFragmentationScore: row.focusFragmentationScore / 1000,
  };
}

export function updateSessionInsights(id: string, insightsJson: string) {
  const db = getDb();
  return db.update(sessions)
    .set({ aiInsightsJson: insightsJson })
    .where(eq(sessions.id, id))
    .run();
}

export function deleteSession(id: string) {
  const db = getDb();
  db.delete(appEvents).where(eq(appEvents.sessionId, id)).run();
  db.delete(contextBlocks).where(eq(contextBlocks.sessionId, id)).run();
  db.delete(sessions).where(eq(sessions.id, id)).run();
}

// App Events
export function insertAppEvent(event: {
  id: string;
  sessionId: string;
  timestamp: number;
  appName: string;
  windowTitle: string;
  bundleId: string;
  durationMs: number;
  isIdle: boolean;
}) {
  const db = getDb();
  return db.insert(appEvents).values(event).run();
}

export function insertAppEventsBatch(events: Array<{
  id: string;
  sessionId: string;
  timestamp: number;
  appName: string;
  windowTitle: string;
  bundleId: string;
  durationMs: number;
  isIdle: boolean;
}>) {
  const db = getDb();
  if (events.length === 0) return;
  return db.insert(appEvents).values(events).run();
}

export function getSessionEvents(sessionId: string) {
  const db = getDb();
  return db.select().from(appEvents)
    .where(eq(appEvents.sessionId, sessionId))
    .orderBy(appEvents.timestamp)
    .all();
}

// Context Blocks
export function insertContextBlocks(blocks: Array<{
  id: string;
  sessionId: string;
  clusterId: string;
  startTimestamp: number;
  endTimestamp: number;
  durationMs: number;
  appNamesJson: string;
  eventCount: number;
  wasInterrupted: boolean;
}>) {
  const db = getDb();
  if (blocks.length === 0) return;
  return db.insert(contextBlocks).values(blocks).run();
}

export function getSessionContextBlocks(sessionId: string) {
  const db = getDb();
  return db.select().from(contextBlocks)
    .where(eq(contextBlocks.sessionId, sessionId))
    .orderBy(contextBlocks.startTimestamp)
    .all();
}

// Monthly Summaries
export function getSessionsForMonth(yearMonth: string) {
  // yearMonth = "2026-02" → range from 2026-02-01 to 2026-03-01
  const [year, month] = yearMonth.split('-').map(Number);
  const startDate = new Date(year, month - 1, 1);
  const endDate = new Date(year, month, 1);

  const db = getDb();
  const rows = db.select().from(sessions)
    .where(
      and(
        eq(sessions.status, 'completed'),
        gte(sessions.startedAt, startDate.getTime()),
        lt(sessions.startedAt, endDate.getTime())
      )
    )
    .orderBy(sessions.startedAt)
    .all();

  return rows.map((row) => ({
    ...row,
    focusFragmentationScore: row.focusFragmentationScore / 1000,
  }));
}

export function getMonthlySummary(yearMonth: string) {
  const db = getDb();
  return db.select().from(monthlySummaries)
    .where(eq(monthlySummaries.yearMonth, yearMonth))
    .get();
}

export function upsertMonthlySummary(data: {
  id: string;
  yearMonth: string;
  generatedAt: number;
  sessionCount: number;
  totalFocusTimeMs: number;
  avgFocusTimePerSessionMs: number;
  avgAppSwitchesPerSession: number;
  avgRecoveryTimeMs: number;
  avgFragmentationScore: number;
  totalInterruptions: number;
  topAppsJson: string;
  topInterruptionSourcesJson: string;
  focusTrendJson: string;
  aiRecapJson: string | null;
}) {
  const db = getDb();
  // Try insert, on conflict update
  return db.insert(monthlySummaries).values({
    ...data,
    avgFragmentationScore: Math.round(data.avgFragmentationScore * 1000),
  }).onConflictDoUpdate({
    target: monthlySummaries.yearMonth,
    set: {
      generatedAt: data.generatedAt,
      sessionCount: data.sessionCount,
      totalFocusTimeMs: data.totalFocusTimeMs,
      avgFocusTimePerSessionMs: data.avgFocusTimePerSessionMs,
      avgAppSwitchesPerSession: data.avgAppSwitchesPerSession,
      avgRecoveryTimeMs: data.avgRecoveryTimeMs,
      avgFragmentationScore: Math.round(data.avgFragmentationScore * 1000),
      totalInterruptions: data.totalInterruptions,
      topAppsJson: data.topAppsJson,
      topInterruptionSourcesJson: data.topInterruptionSourcesJson,
      focusTrendJson: data.focusTrendJson,
      aiRecapJson: data.aiRecapJson,
    },
  }).run();
}
