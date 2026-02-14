import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import type { Session, SessionInsightResponse } from '@attensa/shared';

/* ── local types (match IPC response) ─────────────────────── */

interface AppBreakdown { appName: string; totalMs: number }
interface AppSwitch { from: string; to: string; timestamp: number; durationInFrom: number }
interface TimelineEvent { appName: string; timestamp: number; durationMs: number }
interface SessionMetrics { appBreakdown: AppBreakdown[]; switches: AppSwitch[]; timeline: TimelineEvent[] }

/* ── palette ──────────────────────────────────────────────── */

const BG = [
  'bg-iris', 'bg-foam', 'bg-pine', 'bg-gold', 'bg-love',
  'bg-rosette', 'bg-iris-dim', 'bg-foam-dim', 'bg-pine-dim', 'bg-gold-dim',
];

/* ── constants ────────────────────────────────────────────── */

const DONUT_R = 44;
const DONUT_C = 2 * Math.PI * DONUT_R;

/* ── helpers ──────────────────────────────────────────────── */

function fmt(ms: number) {
  if (ms < 1000) return '<1s';
  const s = Math.round(ms / 1000);
  if (s < 60) return `${s}s`;
  const m = Math.floor(s / 60), sec = s % 60;
  return sec > 0 ? `${m}m ${sec}s` : `${m}m`;
}

function scoreInfo(s: number) {
  if (s >= 80) return { label: 'Excellent', hex: '#9ccfd8', cls: 'text-foam' };
  if (s >= 65) return { label: 'Good', hex: '#9ccfd8', cls: 'text-foam' };
  if (s >= 50) return { label: 'Fair', hex: '#f6c177', cls: 'text-gold' };
  if (s >= 35) return { label: 'Needs Work', hex: '#f6c177', cls: 'text-gold' };
  return { label: 'Poor', hex: '#eb6f92', cls: 'text-love' };
}

function cIdx(name: string, list: string[]) {
  const i = list.indexOf(name);
  return i >= 0 ? i % BG.length : 0;
}

function topPair(sw: AppSwitch[]) {
  const m = new Map<string, { a: string; b: string; n: number }>();
  for (const s of sw) {
    const [a, b] = [s.from, s.to].sort();
    const k = `${a}\0${b}`;
    const e = m.get(k);
    if (e) e.n++; else m.set(k, { a, b, n: 1 });
  }
  let best: { a: string; b: string; n: number } | null = null;
  for (const v of m.values()) if (!best || v.n > best.n) best = v;
  return best;
}

/* ── sub-components ───────────────────────────────────────── */

function ScoreDonut({ score, hex }: { score: number; hex: string }) {
  const offset = DONUT_C * (1 - score / 100);
  return (
    <div className="relative flex-shrink-0" style={{ width: 112, height: 112 }}>
      <svg viewBox="0 0 120 120" className="w-full h-full">
        <circle cx="60" cy="60" r={DONUT_R} fill="none" stroke="#393552" strokeWidth="8" />
        <circle
          cx="60" cy="60" r={DONUT_R} fill="none"
          stroke={hex} strokeWidth="8" strokeLinecap="round"
          strokeDasharray={DONUT_C} strokeDashoffset={offset}
          transform="rotate(-90 60 60)"
          style={{ transition: 'stroke-dashoffset 0.8s ease' }}
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span className="text-2xl font-bold text-fg leading-none">{score}</span>
        <span className="text-[10px] text-muted">/100</span>
      </div>
    </div>
  );
}

function MetricPill({ icon, label, value, sub, accent }: {
  icon: React.ReactNode; label: string; value: string; sub?: string; accent: string;
}) {
  return (
    <div className="bg-surface rounded-xl p-3 flex items-start gap-2.5">
      <div className={`mt-0.5 ${accent} opacity-60`}>{icon}</div>
      <div className="min-w-0">
        <p className="text-lg font-bold text-fg leading-tight">{value}</p>
        <p className="text-[11px] text-subtle uppercase tracking-wider">{label}</p>
        {sub && <p className="text-[11px] text-muted">{sub}</p>}
      </div>
    </div>
  );
}

function DensityChart({ switches, start, end }: {
  switches: AppSwitch[]; start: number; end: number;
}) {
  const N = 16;
  const dur = end - start;
  if (dur <= 0 || switches.length === 0) return null;

  const sz = dur / N;
  const bk = new Array(N).fill(0) as number[];
  for (const s of switches) {
    const i = Math.min(N - 1, Math.max(0, Math.floor((s.timestamp - start) / sz)));
    bk[i]++;
  }
  const mx = Math.max(...bk, 1);
  const peak = bk.indexOf(Math.max(...bk));
  const t = (d: number) =>
    new Date(d).toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit' });

  return (
    <div>
      <div className="flex items-end gap-[3px] h-14 mb-2">
        {bk.map((c, i) => (
          <div
            key={i}
            className={`flex-1 rounded-sm transition-colors ${
              i === peak ? 'bg-love/70' : 'bg-iris/40 hover:bg-iris/60'
            }`}
            style={{ height: `${Math.max(c > 0 ? 8 : 3, (c / mx) * 100)}%` }}
          />
        ))}
      </div>
      <div className="flex justify-between text-[10px] text-muted">
        <span>{t(start)}</span>
        <span>{t(end)}</span>
      </div>
      <p className="text-[11px] text-muted mt-1.5">
        Peak activity: <span className="text-love">{t(start + peak * sz)}</span>
      </p>
    </div>
  );
}

/* ── icons (16×16) ────────────────────────────────────────── */

const ICO = {
  switch: (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="M4 6h8M10 3l3 3-3 3" /><path d="M12 10H4M6 13l-3-3 3-3" />
    </svg>
  ),
  clock: (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="8" cy="8" r="6" /><path d="M8 5v3l2 1.5" />
    </svg>
  ),
  bolt: (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="M9 2L5 9h3l-1 5 4-7H8l1-5z" />
    </svg>
  ),
  grid: (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <rect x="2" y="2" width="5" height="5" rx="1" /><rect x="9" y="2" width="5" height="5" rx="1" />
      <rect x="2" y="9" width="5" height="5" rx="1" /><rect x="9" y="9" width="5" height="5" rx="1" />
    </svg>
  ),
};

/* ── main ─────────────────────────────────────────────────── */

export function SummaryPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [session, setSession] = useState<Session | null>(null);
  const [insights, setInsights] = useState<SessionInsightResponse | null>(null);
  const [loadingInsights, setLoadingInsights] = useState(false);
  const [metrics, setMetrics] = useState<SessionMetrics | null>(null);
  const [showAllApps, setShowAllApps] = useState(false);

  useEffect(() => {
    if (!id) return;
    window.attensa.session.getById(id).then(setSession);
    window.attensa.session.getMetrics(id).then(setMetrics);
  }, [id]);

  useEffect(() => {
    if (!session?.aiInsightsJson) {
      if (session && id) {
        setLoadingInsights(true);
        window.attensa.insights
          .generate(id)
          .then((result: SessionInsightResponse) => setInsights(result))
          .catch(() => {})
          .finally(() => setLoadingInsights(false));
      }
    } else {
      try {
        setInsights(JSON.parse(session.aiInsightsJson));
      } catch {}
    }
  }, [session, id]);

  /* loading state */
  if (!session) {
    return (
      <div className="flex items-center justify-center min-h-screen text-subtle">
        Loading...
      </div>
    );
  }

  /* computed */
  const focusScore = Math.round((1 - session.focusFragmentationScore) * 100);
  const si = scoreInfo(focusScore);
  const focusPct = session.actualDurationMs > 0
    ? Math.round((session.totalFocusTimeMs / session.actualDurationMs) * 100) : 0;
  const durMin = Math.round(session.actualDurationMs / 60000);
  const switchRate = session.actualDurationMs > 0
    ? (session.appSwitchCount / (session.actualDurationMs / 60000)).toFixed(1) : '0';
  const dateStr = new Date(session.startedAt).toLocaleDateString(undefined, {
    weekday: 'short', month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit',
  });
  const appNames = metrics?.appBreakdown.map(a => a.appName) || [];
  const totalMs = metrics?.appBreakdown.reduce((s, a) => s + a.totalMs, 0) || 1;
  const visibleApps = showAllApps ? metrics?.appBreakdown : metrics?.appBreakdown.slice(0, 5);
  const pair = metrics ? topPair(metrics.switches) : null;

  return (
    <div className="min-h-screen px-6 py-5 max-w-4xl mx-auto">

      {/* ── header ────────────────────────────────────────── */}
      <div className="flex justify-between items-center mb-5">
        <button
          onClick={() => navigate('/')}
          className="text-sm text-muted hover:text-fg transition-colors flex items-center gap-1"
        >
          <svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
            <path d="M9 11L5 7l4-4" />
          </svg>
          Back
        </button>
        <button
          onClick={async () => {
            if (!id) return;
            await window.attensa.session.delete(id);
            navigate('/');
          }}
          className="px-3 py-1 text-xs rounded-lg text-muted hover:text-love hover:bg-love/10 transition-all"
        >
          Delete
        </button>
      </div>

      {/* ── hero ──────────────────────────────────────────── */}
      <div className="bg-surface rounded-2xl p-5 mb-3 flex gap-5 items-center">
        <ScoreDonut score={focusScore} hex={si.hex} />
        <div className="flex-1 min-w-0">
          <div className="flex items-baseline gap-2 mb-0.5">
            <h1 className="text-xl font-bold text-fg">Focus Score</h1>
            <span className={`text-sm font-semibold ${si.cls}`}>{si.label}</span>
          </div>
          <p className="text-sm text-subtle mb-2.5">
            {durMin} min · {focusPct}% focus · {dateStr}
          </p>
          {loadingInsights ? (
            <div className="h-4 bg-overlay rounded w-3/4 animate-pulse" />
          ) : insights?.sessionQualitySummary ? (
            <p className="text-sm text-fg/75 leading-relaxed line-clamp-2">
              {insights.sessionQualitySummary}
            </p>
          ) : null}
        </div>
      </div>

      {/* ── metrics strip ─────────────────────────────────── */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-2.5 mb-3">
        <MetricPill icon={ICO.switch} label="Switches" value={String(session.appSwitchCount)} sub={`${switchRate}/min`} accent="text-iris" />
        <MetricPill icon={ICO.clock}  label="Recovery" value={`${(session.avgRecoveryTimeMs / 1000).toFixed(0)}s`} accent="text-foam" />
        <MetricPill icon={ICO.bolt}   label="Interruptions" value={String(session.interruptionCount)} accent="text-love" />
        <MetricPill icon={ICO.grid}   label="Contexts" value={String(session.contextSwitchCount)} accent="text-gold" />
      </div>

      {/* ── two-column: app time + switch patterns ────────── */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-2.5 mb-3">

        {/* app time */}
        <div className="bg-surface rounded-xl p-4">
          <h2 className="text-xs text-subtle uppercase tracking-wider font-medium mb-3">
            Time per App
          </h2>
          {metrics && metrics.appBreakdown.length > 0 ? (
            <>
              {/* stacked bar */}
              <div className="flex h-2.5 rounded-full overflow-hidden mb-3">
                {metrics.appBreakdown.map(app => {
                  const pct = (app.totalMs / totalMs) * 100;
                  if (pct < 1) return null;
                  return (
                    <div
                      key={app.appName}
                      className={BG[cIdx(app.appName, appNames)]}
                      style={{ width: `${pct}%` }}
                    />
                  );
                })}
              </div>

              {/* legend */}
              <div className="space-y-1.5">
                {visibleApps?.map(app => {
                  const pct = Math.round((app.totalMs / totalMs) * 100);
                  const ci = cIdx(app.appName, appNames);
                  return (
                    <div key={app.appName} className="flex items-center justify-between text-xs">
                      <div className="flex items-center gap-2 min-w-0">
                        <div className={`w-2 h-2 rounded-sm flex-shrink-0 ${BG[ci]}`} />
                        <span className="text-fg truncate">{app.appName}</span>
                      </div>
                      <div className="flex gap-2 flex-shrink-0 ml-2">
                        <span className="text-muted">{fmt(app.totalMs)}</span>
                        <span className="text-subtle w-7 text-right">{pct}%</span>
                      </div>
                    </div>
                  );
                })}
              </div>

              {metrics.appBreakdown.length > 5 && (
                <button
                  onClick={() => setShowAllApps(!showAllApps)}
                  className="text-[11px] text-muted hover:text-fg mt-2 transition-colors"
                >
                  {showAllApps ? 'Show less' : `+${metrics.appBreakdown.length - 5} more`}
                </button>
              )}
            </>
          ) : (
            <p className="text-xs text-muted">No app data recorded</p>
          )}
        </div>

        {/* switch patterns */}
        <div className="bg-surface rounded-xl p-4">
          <h2 className="text-xs text-subtle uppercase tracking-wider font-medium mb-3">
            Switch Activity
          </h2>
          {metrics && metrics.switches.length > 0 && session.endedAt ? (
            <>
              <DensityChart
                switches={metrics.switches}
                start={session.startedAt}
                end={session.endedAt}
              />
              {pair && (
                <div className="mt-3 pt-3 border-t border-overlay">
                  <p className="text-[11px] text-muted mb-1">Most frequent pair</p>
                  <div className="flex items-center gap-1.5 text-xs">
                    <span className="text-fg font-medium truncate">{pair.a}</span>
                    <svg width="12" height="12" viewBox="0 0 12 12" className="flex-shrink-0 text-muted">
                      <path d="M2 6h8M7 3l3 3-3 3" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                    <span className="text-fg font-medium truncate">{pair.b}</span>
                    <span className="text-muted ml-auto flex-shrink-0">{pair.n}×</span>
                  </div>
                </div>
              )}
            </>
          ) : (
            <p className="text-xs text-muted">No switches recorded</p>
          )}
        </div>
      </div>

      {/* ── AI insights ───────────────────────────────────── */}
      {loadingInsights ? (
        <div>
          <h2 className="text-xs text-subtle uppercase tracking-wider font-medium mb-2.5">
            Insights
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-2.5">
            {[1, 2, 3].map(i => (
              <div key={i} className="bg-surface rounded-xl p-3.5 animate-pulse">
                <div className="h-3 bg-overlay rounded w-16 mb-2" />
                <div className="h-3 bg-overlay rounded w-full mb-1.5" />
                <div className="h-3 bg-overlay rounded w-2/3" />
              </div>
            ))}
          </div>
          <p className="text-[11px] text-muted text-center mt-2">Analyzing session...</p>
        </div>
      ) : insights && (insights.recommendations.length > 0 || insights.systemicIssue) ? (
        <div>
          <h2 className="text-xs text-subtle uppercase tracking-wider font-medium mb-2.5">
            Insights
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-2.5">
            {insights.recommendations.map((rec, i) => (
              <div key={i} className="bg-surface rounded-xl p-3.5">
                <span className="text-[11px] text-iris uppercase tracking-wider font-medium">
                  {rec.category}
                </span>
                <p className="text-xs text-fg leading-relaxed mt-1">{rec.text}</p>
              </div>
            ))}
            {insights.systemicIssue && (
              <div className="bg-surface border border-gold/30 rounded-xl p-3.5">
                <div className="flex items-center gap-2 mb-1">
                  <span className="text-[11px] text-gold uppercase tracking-wider font-medium">
                    Systemic Issue
                  </span>
                  <span className={`text-[10px] px-1.5 py-0.5 rounded ${
                    insights.systemicIssue.severity === 'high'
                      ? 'bg-love/20 text-love'
                      : insights.systemicIssue.severity === 'medium'
                        ? 'bg-gold/20 text-gold'
                        : 'bg-overlay text-subtle'
                  }`}>
                    {insights.systemicIssue.severity}
                  </span>
                </div>
                <p className="text-xs text-fg leading-relaxed">{insights.systemicIssue.text}</p>
              </div>
            )}
          </div>
        </div>
      ) : !loadingInsights && !insights ? (
        <p className="text-xs text-muted text-center">
          AI insights unavailable. Add your Gemini API key in Settings.
        </p>
      ) : null}
    </div>
  );
}
