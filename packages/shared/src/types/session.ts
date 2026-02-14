export interface AppEvent {
  id: string;
  sessionId: string;
  timestamp: number;
  appName: string;
  windowTitle: string;
  bundleId: string;
  durationMs: number;
  isIdle: boolean;
}

export type SessionStatus = 'active' | 'completed' | 'cancelled';

export interface Session {
  id: string;
  startedAt: number;
  endedAt: number | null;
  plannedDurationMs: number;
  actualDurationMs: number;
  status: SessionStatus;
  totalFocusTimeMs: number;
  appSwitchCount: number;
  avgRecoveryTimeMs: number;
  focusFragmentationScore: number;
  interruptionCount: number;
  contextSwitchCount: number;
  idleTimeMs: number;
  aiInsightsJson: string | null;
}

export interface ContextBlock {
  id: string;
  sessionId: string;
  clusterId: string;
  startTimestamp: number;
  endTimestamp: number;
  durationMs: number;
  appNames: string[];
  eventCount: number;
  wasInterrupted: boolean;
}

export interface MonthlySummary {
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
}
