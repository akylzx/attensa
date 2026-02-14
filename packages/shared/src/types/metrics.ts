export interface SessionMetrics {
  totalFocusTimeMs: number;
  appSwitchCount: number;
  avgRecoveryTimeMs: number;
  focusFragmentationScore: number;
  interruptionCount: number;
  contextSwitchCount: number;
  idleTimeMs: number;
}

export interface TopApp {
  appName: string;
  totalDurationMs: number;
  percentage: number;
}

export interface InterruptionSource {
  appName: string;
  count: number;
}

export interface WeeklyTrend {
  weekNumber: number;
  avgScore: number;
}
