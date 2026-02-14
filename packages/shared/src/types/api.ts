import type { Session, ContextBlock } from './session.js';
import type { SessionInsightResponse, MonthlyInsightResponse, Trend } from './insights.js';
import type { TopApp, InterruptionSource, WeeklyTrend } from './metrics.js';

// POST /v1/sessions
export interface UploadSessionRequest {
  session: Omit<Session, 'aiInsightsJson'>;
  contextBlocks: Array<{
    clusterId: string;
    durationMs: number;
    appNames: string[];
    eventCount: number;
    wasInterrupted: boolean;
  }>;
  topApps: Array<{ appName: string; durationMs: number }>;
  orgId?: string;
}

export interface UploadSessionResponse {
  status: 'accepted';
  sessionId: string;
}

// POST /v1/sessions/:id/insights
export interface SessionInsightsResponse {
  sessionId: string;
  insights: SessionInsightResponse;
}

// POST /v1/recap/monthly
export interface MonthlyRecapRequest {
  yearMonth: string;
  sessions: Array<{
    id: string;
    startedAt: number;
    totalFocusTimeMs: number;
    appSwitchCount: number;
    focusFragmentationScore: number;
    interruptionCount: number;
    contextSwitchCount: number;
    plannedDurationMs: number;
  }>;
  aggregates: {
    totalSessions: number;
    totalFocusTimeMs: number;
    avgFragmentationScore: number;
    avgRecoveryTimeMs: number;
    topInterruptionSources: InterruptionSource[];
    weeklyTrend: WeeklyTrend[];
  };
}

export interface MonthlyRecapResponse {
  yearMonth: string;
  insights: MonthlyInsightResponse;
}

// GET /v1/team/:orgId/analytics
export interface TeamAnalyticsResponse {
  orgId: string;
  yearMonth: string;
  teamMetrics: {
    memberCount: number;
    avgFocusScorePerMember: number;
    avgFragmentationScore: number;
    avgSessionsPerMember: number;
    totalTeamFocusHours: number;
    commonInterruptionSources: Array<{ source: string; avgPerSession: number }>;
    focusTrend: WeeklyTrend[];
  };
  teams: Array<{
    teamName: string;
    memberCount: number;
    avgFocusScore: number;
    avgFragmentationScore: number;
    topInterruptionSource: string;
  }>;
}
