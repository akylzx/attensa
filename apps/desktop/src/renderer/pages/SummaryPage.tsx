import { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import type { Session, SessionInsightResponse } from '@attensa/shared';

/* ── local types (match IPC response) ─────────────────────── */

interface AppBreakdown { appName: string; totalMs: number }
interface AppSwitch { from: string; to: string; timestamp: number; durationInFrom: number }
interface TimelineEvent { appName: string; timestamp: number; durationMs: number }
interface SessionMetrics { appBreakdown: AppBreakdown[]; switches: AppSwitch[]; timeline: TimelineEvent[] }

/* ── palette ──────────────────────────────────────────────── */

const BG = [
  'bg-accent', 'bg-focus-high', 'bg-accent-dim', 'bg-focus-mid', 'bg-focus-low',
  'bg-insight', 'bg-streak', 'bg-focus-high-dim', 'bg-focus-mid-dim', 'bg-focus-low-dim',
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
  const focusHigh = getComputedStyle(document.documentElement).getPropertyValue('--t-focus-high').trim() || '#6DD4B1';
  const focusMid = getComputedStyle(document.documentElement).getPropertyValue('--t-focus-mid').trim() || '#E4B76A';
  const focusLow = getComputedStyle(document.documentElement).getPropertyValue('--t-focus-low').trim() || '#D96B6B';
  if (s >= 80) return { label: 'Excellent', hex: focusHigh, cls: 'text-focus-high' };
  if (s >= 65) return { label: 'Good', hex: focusHigh, cls: 'text-focus-high' };
  if (s >= 50) return { label: 'Fair', hex: focusMid, cls: 'text-focus-mid' };
  if (s >= 35) return { label: 'Needs Work', hex: focusMid, cls: 'text-focus-mid' };
  return { label: 'Poor', hex: focusLow, cls: 'text-focus-low' };
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
  const [copied, setCopied] = useState(false);

  const handleCopy = useCallback(() => {
    navigator.clipboard.writeText(String(score)).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    });
  }, [score]);

  return (
    <div
      className="relative flex-shrink-0 w-24 h-24 sm:w-28 sm:h-28 cursor-pointer group/donut"
      onClick={handleCopy}
      title="Click to copy score"
    >
      <svg viewBox="0 0 120 120" className="w-full h-full transition-transform duration-200 group-hover/donut:scale-105">
        <defs>
          <filter id="donutGlow">
            <feGaussianBlur stdDeviation="3" result="blur" />
            <feMerge>
              <feMergeNode in="blur" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
        </defs>
        <circle cx="60" cy="60" r={DONUT_R} fill="none" stroke="var(--t-overlay)" strokeWidth="8" />
        <circle
          cx="60" cy="60" r={DONUT_R} fill="none"
          stroke={hex} strokeWidth="8" strokeLinecap="round"
          strokeDasharray={DONUT_C} strokeDashoffset={offset}
          transform="rotate(-90 60 60)"
          filter="url(#donutGlow)"
          style={{ transition: 'stroke-dashoffset 0.8s ease' }}
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        {copied ? (
          <span className="text-xs text-focus-high font-medium animate-[fadeIn_150ms_ease-out]">Copied!</span>
        ) : (
          <>
            <span className="text-xl sm:text-2xl font-bold text-fg leading-none">{score}</span>
            <span className="text-[9px] sm:text-[10px] text-fg-faint">/100</span>
          </>
        )}
      </div>
    </div>
  );
}

function MetricPill({ icon, label, value, sub, accent, detail }: {
  icon: React.ReactNode; label: string; value: string; sub?: string; accent: string; detail?: string;
}) {
  const [expanded, setExpanded] = useState(false);
  return (
    <div
      className={`bg-surface rounded-xl p-3 flex items-start gap-2.5 border shadow-surface hover:shadow-overlay hover:-translate-y-px transition-all duration-200 ${detail ? 'cursor-pointer' : ''} ${expanded ? 'border-[var(--t-border-medium)]' : 'border-[var(--t-border-subtle)] hover:border-[var(--t-border-medium)]'}`}
      onClick={detail ? () => setExpanded(!expanded) : undefined}
    >
      <div className={`mt-0.5 ${accent} opacity-60`}>{icon}</div>
      <div className="min-w-0">
        <p className="text-lg font-bold text-fg leading-tight">{value}</p>
        <p className="text-[11px] text-fg-muted uppercase tracking-wider">{label}</p>
        {sub && <p className="text-[11px] text-fg-faint">{sub}</p>}
        {expanded && detail && (
          <p className="text-[11px] text-fg-muted mt-1.5 leading-relaxed animate-[fadeIn_200ms_ease-out]">{detail}</p>
        )}
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
            className={`flex-1 rounded-sm transition-all duration-150 hover:scale-y-105 origin-bottom ${
              i === peak ? 'bg-focus-low/70 hover:bg-focus-low/90' : 'bg-accent/40 hover:bg-accent/70'
            }`}
            style={{ height: `${Math.max(c > 0 ? 8 : 3, (c / mx) * 100)}%` }}
            title={`${c} switch${c !== 1 ? 'es' : ''} · ${t(start + i * sz)}`}
          />
        ))}
      </div>
      <div className="flex justify-between text-[10px] text-fg-faint">
        <span>{t(start)}</span>
        <span>{t(end)}</span>
      </div>
      <p className="text-[11px] text-fg-faint mt-1.5">
        Peak activity: <span className="text-focus-low">{t(start + peak * sz)}</span>
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
  const [confirmingDelete, setConfirmingDelete] = useState(false);
  const [detailsOpen, setDetailsOpen] = useState(true);
  const [insightsOpen, setInsightsOpen] = useState(true);

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
      <div className="flex items-center justify-center min-h-screen text-fg-muted">
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
    <div className="min-h-screen px-6 sm:px-10 py-4 sm:py-5">

      {/* ── header ────────────────────────────────────────── */}
      <div className="flex justify-between items-center mb-5">
        <button
          onClick={() => navigate('/')}
          className="text-sm text-fg-faint hover:text-fg transition-colors flex items-center gap-1"
        >
          <svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
            <path d="M9 11L5 7l4-4" />
          </svg>
          Back
        </button>
        <button
          onClick={() => {
            if (!id) return;
            if (confirmingDelete) {
              setConfirmingDelete(false);
              window.attensa.session.delete(id).then(() => navigate('/'));
            } else {
              setConfirmingDelete(true);
              setTimeout(() => setConfirmingDelete(false), 3000);
            }
          }}
          className={`px-3 py-1 text-xs rounded-lg transition-all ${
            confirmingDelete
              ? 'bg-focus-low/20 text-focus-low font-medium'
              : 'text-fg-faint hover:text-focus-low hover:bg-focus-low/10'
          }`}
        >
          {confirmingDelete ? 'Confirm delete?' : 'Delete'}
        </button>
      </div>

      {/* ── hero ──────────────────────────────────────────── */}
      <div
        className="bg-surface rounded-2xl p-5 mb-3 flex flex-col sm:flex-row gap-4 sm:gap-5 items-center border border-[var(--t-border-subtle)] shadow-surface hover:shadow-overlay hover:border-[var(--t-border-medium)] transition-all duration-200"
        style={{ animation: 'card-enter 500ms var(--ease-out) both' }}
      >
        <ScoreDonut score={focusScore} hex={si.hex} />
        <div className="flex-1 min-w-0 text-center sm:text-left">
          <div className="flex items-baseline justify-center sm:justify-start gap-2 mb-0.5">
            <h1 className="text-xl font-bold text-fg">Focus Score</h1>
            <span className={`text-sm font-semibold ${si.cls}`}>{si.label}</span>
          </div>
          <p className="text-sm text-fg-muted mb-2.5">
            {durMin} min · {focusPct}% focus · {dateStr}
          </p>
          {loadingInsights ? (
            <div className="h-4 bg-overlay rounded w-3/4 animate-pulse mx-auto sm:mx-0" />
          ) : insights?.sessionQualitySummary ? (
            <p className="text-sm text-fg/75 leading-relaxed line-clamp-2">
              {insights.sessionQualitySummary}
            </p>
          ) : null}
        </div>
      </div>

      {/* ── metrics strip ─────────────────────────────────── */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-2.5 mb-3">
        {[
          <MetricPill key="sw" icon={ICO.switch} label="Switches" value={String(session.appSwitchCount)} sub={`${switchRate}/min`} accent="text-accent" detail="Total number of times you switched between different applications during this session. Lower is better for deep focus." />,
          <MetricPill key="rc" icon={ICO.clock}  label="Recovery" value={`${(session.avgRecoveryTimeMs / 1000).toFixed(0)}s`} accent="text-focus-high" detail="Average time it took to return to your primary task after each distraction or context switch." />,
          <MetricPill key="ir" icon={ICO.bolt}   label="Interruptions" value={String(session.interruptionCount)} accent="text-focus-low" detail="Number of focus context blocks that were interrupted by an unrelated app before naturally completing." />,
          <MetricPill key="cx" icon={ICO.grid}   label="Contexts" value={String(session.contextSwitchCount)} accent="text-focus-mid" detail="Number of distinct focus contexts (groups of related apps) you worked in during this session." />,
        ].map((pill, i) => (
          <div key={i} style={{ animation: `card-enter 400ms var(--ease-out) ${100 + i * 60}ms both` }}>
            {pill}
          </div>
        ))}
      </div>

      {/* ── details section header ──────────────────────── */}
      <button
        onClick={() => setDetailsOpen(!detailsOpen)}
        className="flex items-center gap-2 mb-2.5 group/toggle w-full"
      >
        <h2 className="text-xs text-fg-muted uppercase tracking-wider font-medium">Details</h2>
        <svg
          width="12" height="12" viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"
          className={`text-fg-faint transition-transform duration-200 ${detailsOpen ? 'rotate-0' : '-rotate-90'}`}
        >
          <path d="M3 4.5L6 7.5L9 4.5" />
        </svg>
        <div className="flex-1 h-px bg-[var(--t-border-subtle)]" />
      </button>

      {/* ── two-column: app time + switch patterns ────────── */}
      <div className={`grid grid-cols-1 md:grid-cols-2 gap-2.5 mb-3 transition-all duration-300 overflow-hidden ${detailsOpen ? 'max-h-[2000px] opacity-100' : 'max-h-0 opacity-0'}`} style={{ animation: detailsOpen ? 'card-enter 400ms var(--ease-out) 400ms both' : undefined }}>

        {/* app time */}
        <div className="bg-surface rounded-xl p-4 border border-[var(--t-border-subtle)] shadow-surface hover:shadow-overlay hover:border-[var(--t-border-medium)] transition-all duration-200">
          <h2 className="text-xs text-fg-muted uppercase tracking-wider font-medium mb-3">
            Time per App
          </h2>
          {metrics && metrics.appBreakdown.length > 0 ? (
            <>
              {/* stacked bar */}
              <div className="flex h-2.5 rounded-full overflow-hidden mb-3 group/bar">
                {metrics.appBreakdown.map(app => {
                  const pct = (app.totalMs / totalMs) * 100;
                  if (pct < 1) return null;
                  return (
                    <div
                      key={app.appName}
                      className={`${BG[cIdx(app.appName, appNames)]} hover:brightness-125 transition-all duration-150 relative group/seg`}
                      style={{ width: `${pct}%` }}
                      title={`${app.appName}: ${fmt(app.totalMs)} (${Math.round(pct)}%)`}
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
                    <div key={app.appName} className="flex items-center justify-between text-xs px-1.5 py-1 -mx-1.5 rounded-md hover:bg-overlay transition-colors duration-150">
                      <div className="flex items-center gap-2 min-w-0">
                        <div className={`w-2 h-2 rounded-sm flex-shrink-0 ${BG[ci]}`} />
                        <span className="text-fg truncate">{app.appName}</span>
                      </div>
                      <div className="flex gap-2 flex-shrink-0 ml-2">
                        <span className="text-fg-faint">{fmt(app.totalMs)}</span>
                        <span className="text-fg-muted w-7 text-right">{pct}%</span>
                      </div>
                    </div>
                  );
                })}
              </div>

              {metrics.appBreakdown.length > 5 && (
                <button
                  onClick={() => setShowAllApps(!showAllApps)}
                  className="text-[11px] text-fg-faint hover:text-fg mt-2 transition-colors"
                >
                  {showAllApps ? 'Show less' : `+${metrics.appBreakdown.length - 5} more`}
                </button>
              )}
            </>
          ) : (
            <p className="text-xs text-fg-faint">No app data recorded</p>
          )}
        </div>

        {/* switch patterns */}
        <div className="bg-surface rounded-xl p-4 border border-[var(--t-border-subtle)] shadow-surface hover:shadow-overlay hover:border-[var(--t-border-medium)] transition-all duration-200">
          <h2 className="text-xs text-fg-muted uppercase tracking-wider font-medium mb-3">
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
                <div className="mt-3 pt-3 border-t border-fg-ghost">
                  <p className="text-[11px] text-fg-faint mb-1">Most frequent pair</p>
                  <div className="flex items-center gap-1.5 text-xs px-1.5 py-1.5 -mx-1.5 rounded-md hover:bg-overlay transition-colors duration-150">
                    <span className="text-fg font-medium truncate">{pair.a}</span>
                    <svg width="12" height="12" viewBox="0 0 12 12" className="flex-shrink-0 text-fg-faint">
                      <path d="M2 6h8M7 3l3 3-3 3" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                    <span className="text-fg font-medium truncate">{pair.b}</span>
                    <span className="text-fg-faint ml-auto flex-shrink-0">{pair.n}×</span>
                  </div>
                </div>
              )}
            </>
          ) : (
            <p className="text-xs text-fg-faint">No switches recorded</p>
          )}
        </div>
      </div>

      {/* ── AI insights ───────────────────────────────────── */}
      {loadingInsights ? (
        <div>
          <button onClick={() => setInsightsOpen(!insightsOpen)} className="flex items-center gap-2.5 mb-4 w-full group/toggle">
            <div className="text-insight">
              <svg width="18" height="18" viewBox="0 0 18 18" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                <path d="M9 2L6 9h3l-1 7 5-9h-3l1-5z" />
              </svg>
            </div>
            <h2 className="text-sm font-semibold text-fg">AI Insights</h2>
            <svg width="12" height="12" viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className={`text-fg-faint transition-transform duration-200 ${insightsOpen ? 'rotate-0' : '-rotate-90'}`}>
              <path d="M3 4.5L6 7.5L9 4.5" />
            </svg>
            <div className="flex-1 h-px bg-[var(--t-border-subtle)]" />
          </button>
          <div className="space-y-3">
            {[1, 2, 3].map(i => (
              <div key={i} className="bg-surface rounded-xl p-4 border-l-2 border-overlay animate-pulse">
                <div className="h-3 bg-overlay rounded w-20 mb-3" />
                <div className="h-3.5 bg-overlay rounded w-full mb-2" />
                <div className="h-3.5 bg-overlay rounded w-3/4" />
              </div>
            ))}
          </div>
          <p className="text-xs text-fg-faint text-center mt-3">Analyzing your session...</p>
        </div>
      ) : insights && (insights.recommendations.length > 0 || insights.systemicIssue) ? (
        <div>
          <button onClick={() => setInsightsOpen(!insightsOpen)} className="flex items-center gap-2.5 mb-4 w-full group/toggle">
            <div className="text-insight">
              <svg width="18" height="18" viewBox="0 0 18 18" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                <path d="M9 2L6 9h3l-1 7 5-9h-3l1-5z" />
              </svg>
            </div>
            <h2 className="text-sm font-semibold text-fg">AI Insights</h2>
            <svg width="12" height="12" viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className={`text-fg-faint transition-transform duration-200 ${insightsOpen ? 'rotate-0' : '-rotate-90'}`}>
              <path d="M3 4.5L6 7.5L9 4.5" />
            </svg>
            <div className="flex-1 h-px bg-[var(--t-border-subtle)]" />
          </button>

          <div className={`transition-all duration-300 overflow-hidden ${insightsOpen ? 'max-h-[2000px] opacity-100' : 'max-h-0 opacity-0'}`}>

          {/* Systemic issue callout */}
          {insights.systemicIssue && (
            <div
              className={`rounded-xl p-4 mb-3 border transition-all duration-200 hover:shadow-overlay ${
                insights.systemicIssue.severity === 'high'
                  ? 'bg-focus-low/5 border-focus-low/30'
                  : insights.systemicIssue.severity === 'medium'
                    ? 'bg-focus-mid/5 border-focus-mid/30'
                    : 'bg-surface border-[var(--t-border-subtle)]'
              }`}
              style={{ animation: 'card-enter 400ms var(--ease-out) 500ms both' }}
            >
              <div className="flex items-center gap-2.5 mb-2">
                <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className={
                  insights.systemicIssue.severity === 'high' ? 'text-focus-low' : 'text-focus-mid'
                }>
                  <path d="M8 1.5L1 13.5h14L8 1.5z" /><path d="M8 6v3" /><circle cx="8" cy="11" r="0.5" fill="currentColor" />
                </svg>
                <span className="text-xs font-semibold text-fg uppercase tracking-wider">
                  Systemic Issue
                </span>
                <span className={`text-[10px] px-2 py-0.5 rounded-full font-medium ${
                  insights.systemicIssue.severity === 'high'
                    ? 'bg-focus-low/15 text-focus-low'
                    : insights.systemicIssue.severity === 'medium'
                      ? 'bg-focus-mid/15 text-focus-mid'
                      : 'bg-overlay text-fg-muted'
                }`}>
                  {insights.systemicIssue.severity}
                </span>
              </div>
              <p className="text-sm text-fg/85 leading-relaxed">{insights.systemicIssue.text}</p>
            </div>
          )}

          {/* Recommendation cards */}
          <div className="space-y-2.5">
            {insights.recommendations.map((rec, i) => (
              <div
                key={i}
                className="bg-surface rounded-xl p-4 border-l-2 border-insight/40 hover:border-insight/70 hover:shadow-overlay transition-all duration-200"
                style={{ animation: `card-enter 400ms var(--ease-out) ${600 + i * 80}ms both` }}
              >
                <span className="inline-block text-[11px] text-insight font-semibold uppercase tracking-wider bg-insight/8 px-2 py-0.5 rounded-md mb-2">
                  {rec.category}
                </span>
                <p className="text-sm text-fg/85 leading-relaxed">{rec.text}</p>
              </div>
            ))}
          </div>
          </div>
        </div>
      ) : !loadingInsights && !insights ? (
        <div className="bg-surface rounded-xl border border-[var(--t-border-subtle)] p-6 text-center">
          <div className="text-fg-ghost mb-3">
            <svg width="28" height="28" viewBox="0 0 28 28" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className="mx-auto">
              <path d="M14 4L10 14h5l-2 10 8-14h-5l2-6z" />
            </svg>
          </div>
          <p className="text-sm text-fg-faint mb-1">AI insights unavailable</p>
          <p className="text-xs text-fg-faint">
            Add your Gemini API key in{' '}
            <button
              onClick={() => navigate('/settings')}
              className="text-accent hover:text-accent/80 underline transition-colors"
            >
              Settings
            </button>{' '}
            to unlock session analysis.
          </p>
        </div>
      ) : null}
    </div>
  );
}
