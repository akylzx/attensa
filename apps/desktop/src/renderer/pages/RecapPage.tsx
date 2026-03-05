import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';

function formatMonth(ym: string): string {
  const [year, month] = ym.split('-').map(Number);
  const date = new Date(year, month - 1);
  return date.toLocaleDateString(undefined, { month: 'long', year: 'numeric' });
}

export function RecapPage() {
  const { yearMonth } = useParams<{ yearMonth: string }>();
  const navigate = useNavigate();
  const [recap, setRecap] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);

  useEffect(() => {
    if (!yearMonth) return;
    setLoading(true);
    window.attensa.recap
      .getMonthly(yearMonth)
      .then(setRecap)
      .finally(() => setLoading(false));
  }, [yearMonth]);

  const handleGenerate = () => {
    if (!yearMonth) return;
    setGenerating(true);
    window.attensa.recap
      .generate(yearMonth)
      .then(setRecap)
      .finally(() => setGenerating(false));
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen text-fg-muted">
        Loading recap...
      </div>
    );
  }

  if (!recap) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen px-8">
        <div className="text-fg-ghost mb-4">
          <svg width="40" height="40" viewBox="0 0 40 40" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className="mx-auto">
            <rect x="6" y="8" width="28" height="26" rx="3" />
            <path d="M6 16h28" />
            <path d="M14 8V4M26 8V4" />
          </svg>
        </div>
        <p className="text-fg-muted mb-1 text-center">
          No recap for {yearMonth ? formatMonth(yearMonth) : yearMonth}
        </p>
        <p className="text-xs text-fg-faint mb-5 text-center">
          Generate a recap to see your monthly focus trends and AI insights.
        </p>
        <button
          onClick={handleGenerate}
          disabled={generating}
          className="px-6 py-2.5 bg-gradient-to-br from-accent to-accent-dim text-white rounded-xl text-sm font-medium transition-all hover:-translate-y-px hover:shadow-[0_4px_12px_rgba(123,143,255,0.35)] disabled:opacity-50"
        >
          {generating ? 'Generating...' : 'Generate Recap'}
        </button>
        <button
          onClick={() => navigate('/history')}
          className="mt-4 text-sm text-fg-faint hover:text-fg transition-colors flex items-center gap-1"
        >
          <svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
            <path d="M9 11L5 7l4-4" />
          </svg>
          Back
        </button>
      </div>
    );
  }

  // Parse stored data — avgFragmentationScore is stored as 0-1000 integer
  const fragScore = recap.avgFragmentationScore > 1
    ? recap.avgFragmentationScore / 10  // stored as 0-1000, display as 0-100
    : recap.avgFragmentationScore * 100; // stored as 0-1 float
  const focusScore = Math.round(100 - fragScore);

  let aiInsights: any = null;
  if (recap.aiRecapJson) {
    try {
      aiInsights = typeof recap.aiRecapJson === 'string'
        ? JSON.parse(recap.aiRecapJson)
        : recap.aiRecapJson;
    } catch {}
  }

  let topApps: Array<{ appName: string; durationMs: number }> = [];
  if (recap.topAppsJson) {
    try {
      topApps = typeof recap.topAppsJson === 'string'
        ? JSON.parse(recap.topAppsJson)
        : recap.topAppsJson;
    } catch {}
  }

  let weeklyTrend: Array<{ weekNumber: number; avgScore: number }> = [];
  if (recap.focusTrendJson) {
    try {
      weeklyTrend = typeof recap.focusTrendJson === 'string'
        ? JSON.parse(recap.focusTrendJson)
        : recap.focusTrendJson;
    } catch {}
  }

  const totalAppMs = topApps.reduce((sum, a) => sum + a.durationMs, 0) || 1;

  return (
    <div className="min-h-screen px-6 sm:px-10 py-4 sm:py-5">
      {/* header */}
      <div className="flex justify-between items-center mb-5">
        <button
          onClick={() => navigate('/history')}
          className="text-sm text-fg-faint hover:text-fg transition-colors flex items-center gap-1"
        >
          <svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
            <path d="M9 11L5 7l4-4" />
          </svg>
          Back
        </button>
        <button
          onClick={handleGenerate}
          disabled={generating}
          className="text-xs text-fg-faint hover:text-accent transition-colors disabled:opacity-50"
        >
          {generating ? 'Regenerating...' : 'Regenerate'}
        </button>
      </div>

      {/* title */}
      <h1 className="text-2xl font-bold text-fg mb-1">
        {yearMonth ? formatMonth(yearMonth) : 'Monthly Recap'}
      </h1>
      {aiInsights?.monthSummary && (
        <p className="text-sm text-fg-muted leading-relaxed mb-6">{aiInsights.monthSummary}</p>
      )}
      {!aiInsights?.monthSummary && <div className="mb-6" />}

      {/* stats grid */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-2.5 mb-5" style={{ animation: 'card-enter 500ms var(--ease-out) both' }}>
        <div className="bg-surface rounded-xl p-4 border border-[var(--t-border-subtle)] shadow-surface hover:shadow-overlay hover:border-[var(--t-border-medium)] transition-all duration-200">
          <p className="text-xs text-fg-muted uppercase tracking-wider mb-1">Sessions</p>
          <p className="text-2xl font-bold text-fg">{recap.sessionCount}</p>
        </div>
        <div className="bg-surface rounded-xl p-4 border border-[var(--t-border-subtle)] shadow-surface hover:shadow-overlay hover:border-[var(--t-border-medium)] transition-all duration-200">
          <p className="text-xs text-fg-muted uppercase tracking-wider mb-1">Focus Hours</p>
          <p className="text-2xl font-bold text-fg">
            {(recap.totalFocusTimeMs / 3600000).toFixed(1)}
          </p>
        </div>
        <div className="bg-surface rounded-xl p-4 border border-[var(--t-border-subtle)] shadow-surface hover:shadow-overlay hover:border-[var(--t-border-medium)] transition-all duration-200">
          <p className="text-xs text-fg-muted uppercase tracking-wider mb-1">Focus Score</p>
          <p className={`text-2xl font-bold ${focusScore >= 65 ? 'text-focus-high' : focusScore >= 35 ? 'text-focus-mid' : 'text-focus-low'}`}>
            {focusScore}
          </p>
        </div>
        <div className="bg-surface rounded-xl p-4 border border-[var(--t-border-subtle)] shadow-surface hover:shadow-overlay hover:border-[var(--t-border-medium)] transition-all duration-200">
          <p className="text-xs text-fg-muted uppercase tracking-wider mb-1">Avg Recovery</p>
          <p className="text-2xl font-bold text-fg">{(recap.avgRecoveryTimeMs / 1000).toFixed(0)}s</p>
        </div>
      </div>

      {/* two-column: top apps + weekly trend */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-2.5 mb-5" style={{ animation: 'card-enter 400ms var(--ease-out) 200ms both' }}>
        {/* Top apps */}
        {topApps.length > 0 && (
          <div className="bg-surface rounded-xl p-4 border border-[var(--t-border-subtle)] shadow-surface hover:shadow-overlay hover:border-[var(--t-border-medium)] transition-all duration-200">
            <h2 className="text-xs text-fg-muted uppercase tracking-wider font-medium mb-3">Top Apps</h2>
            <div className="space-y-2">
              {topApps.slice(0, 7).map((app, i) => {
                const pct = Math.round((app.durationMs / totalAppMs) * 100);
                return (
                  <div key={app.appName} className="flex items-center justify-between text-xs px-1.5 py-1 -mx-1.5 rounded-md hover:bg-overlay transition-colors duration-150">
                    <div className="flex items-center gap-2 min-w-0">
                      <span className="text-fg-faint w-3 text-right">{i + 1}</span>
                      <span className="text-fg truncate">{app.appName}</span>
                    </div>
                    <div className="flex gap-2 flex-shrink-0 ml-2">
                      <span className="text-fg-faint">{Math.round(app.durationMs / 60000)}m</span>
                      <span className="text-fg-muted w-7 text-right">{pct}%</span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Weekly trend */}
        {weeklyTrend.length > 0 && (
          <div className="bg-surface rounded-xl p-4 border border-[var(--t-border-subtle)] shadow-surface hover:shadow-overlay hover:border-[var(--t-border-medium)] transition-all duration-200">
            <h2 className="text-xs text-fg-muted uppercase tracking-wider font-medium mb-3">Weekly Trend</h2>
            <div className="flex items-end gap-2 h-20 mb-2">
              {weeklyTrend.map((w) => {
                const focusVal = Math.round((1 - w.avgScore) * 100);
                return (
                  <div key={w.weekNumber} className="flex-1 flex flex-col items-center gap-1">
                    <div
                      className={`w-full rounded-sm transition-all duration-150 hover:brightness-125 ${focusVal >= 65 ? 'bg-focus-high/60' : focusVal >= 35 ? 'bg-focus-mid/60' : 'bg-focus-low/60'}`}
                      style={{ height: `${Math.max(8, focusVal)}%` }}
                      title={`Week ${w.weekNumber}: Focus ${focusVal}`}
                    />
                  </div>
                );
              })}
            </div>
            <div className="flex justify-between text-[10px] text-fg-faint">
              {weeklyTrend.map((w) => (
                <span key={w.weekNumber}>W{w.weekNumber}</span>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* AI Insights */}
      {aiInsights && aiInsights.recommendations?.length > 0 ? (
        <div style={{ animation: 'card-enter 400ms var(--ease-out) 400ms both' }}>
          <div className="flex items-center gap-2.5 mb-4">
            <div className="text-insight">
              <svg width="18" height="18" viewBox="0 0 18 18" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                <path d="M9 2L6 9h3l-1 7 5-9h-3l1-5z" />
              </svg>
            </div>
            <h2 className="text-sm font-semibold text-fg">AI Insights</h2>
          </div>

          {/* Systemic issues */}
          {aiInsights.systemicIssues?.map((issue: any, i: number) => (
            <div
              key={i}
              className={`rounded-xl p-4 mb-3 border transition-all duration-200 hover:shadow-overlay ${
                issue.severity === 'high'
                  ? 'bg-focus-low/5 border-focus-low/30'
                  : issue.severity === 'medium'
                    ? 'bg-focus-mid/5 border-focus-mid/30'
                    : 'bg-surface border-[var(--t-border-subtle)]'
              }`}
            >
              <div className="flex items-center gap-2.5 mb-2">
                <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className={
                  issue.severity === 'high' ? 'text-focus-low' : 'text-focus-mid'
                }>
                  <path d="M8 1.5L1 13.5h14L8 1.5z" /><path d="M8 6v3" /><circle cx="8" cy="11" r="0.5" fill="currentColor" />
                </svg>
                <span className="text-xs font-semibold text-fg uppercase tracking-wider">
                  Systemic Issue
                </span>
                <span className={`text-[10px] px-2 py-0.5 rounded-full font-medium ${
                  issue.severity === 'high'
                    ? 'bg-focus-low/15 text-focus-low'
                    : issue.severity === 'medium'
                      ? 'bg-focus-mid/15 text-focus-mid'
                      : 'bg-overlay text-fg-muted'
                }`}>
                  {issue.severity}
                </span>
                {issue.frequency && (
                  <span className="text-[10px] text-fg-faint">{issue.frequency}</span>
                )}
              </div>
              <p className="text-sm text-fg/85 leading-relaxed">{issue.text}</p>
            </div>
          ))}

          {/* Recommendations */}
          <div className="space-y-2.5">
            {aiInsights.recommendations.map((rec: any, i: number) => (
              <div
                key={i}
                className="bg-surface rounded-xl p-4 border-l-2 border-insight/40 hover:border-insight/70 hover:shadow-overlay transition-all duration-200"
                style={{ animation: `card-enter 400ms var(--ease-out) ${500 + i * 80}ms both` }}
              >
                <div className="flex items-center gap-2 mb-2">
                  <span className="inline-block text-[11px] text-insight font-semibold uppercase tracking-wider bg-insight/8 px-2 py-0.5 rounded-md">
                    {rec.category}
                  </span>
                  {rec.trend && (
                    <span className={`text-[11px] font-medium ${
                      rec.trend === 'improving' ? 'text-focus-high' :
                      rec.trend === 'declining' ? 'text-focus-low' : 'text-fg-faint'
                    }`}>
                      {rec.trend === 'improving' ? 'Improving' :
                       rec.trend === 'declining' ? 'Declining' : 'Stable'}
                    </span>
                  )}
                </div>
                <p className="text-sm text-fg/85 leading-relaxed">{rec.text}</p>
              </div>
            ))}
          </div>
        </div>
      ) : !aiInsights ? (
        <div className="bg-surface rounded-xl border border-[var(--t-border-subtle)] p-6 text-center">
          <p className="text-xs text-fg-faint">
            AI insights unavailable. Add your Gemini API key in{' '}
            <button onClick={() => navigate('/settings')} className="text-accent hover:text-accent/80 underline transition-colors">
              Settings
            </button>{' '}
            to unlock monthly analysis.
          </p>
        </div>
      ) : null}
    </div>
  );
}
