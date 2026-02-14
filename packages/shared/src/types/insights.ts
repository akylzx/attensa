export type InsightCategory = 'process' | 'environment' | 'timing' | 'tooling';
export type Severity = 'low' | 'medium' | 'high';
export type Trend = 'improving' | 'stable' | 'declining';

export interface SessionInsightResponse {
  recommendations: Array<{
    text: string;
    category: InsightCategory;
  }>;
  systemicIssue: {
    text: string;
    severity: Severity;
  } | null;
  sessionQualitySummary: string;
}

export interface MonthlyInsightResponse {
  recommendations: Array<{
    text: string;
    category: InsightCategory;
    trend: Trend;
  }>;
  systemicIssues: Array<{
    text: string;
    severity: Severity;
    frequency: string;
  }>;
  monthSummary: string;
}
