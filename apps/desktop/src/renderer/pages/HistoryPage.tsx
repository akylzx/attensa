import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid,
  BarChart,
  Bar,
} from 'recharts';
import { useTheme } from '../components/ThemeContext';

function cssVar(name: string): string {
  return getComputedStyle(document.documentElement).getPropertyValue(name).trim();
}

interface Session {
  id: string;
  startedAt: number;
  actualDurationMs: number;
  totalFocusTimeMs: number;
  appSwitchCount: number;
  focusFragmentationScore: number;
  interruptionCount: number;
  plannedDurationMs: number;
}

type ChartMode = 'fragmentation' | 'focusTime' | 'switches';

interface ChartConfig {
  label: string;
  dataKey: string;
  color: string;
  gradientId: string;
  formatter: (v: number) => string;
  domain?: [number, number];
}

function getChartConfigs(): Record<ChartMode, ChartConfig> {
  return {
    fragmentation: {
      label: 'Fragmentation Score',
      dataKey: 'fragmentation',
      color: cssVar('--t-accent'),
      gradientId: 'fragGrad',
      formatter: (v) => `${v.toFixed(0)}`,
      domain: [0, 100],
    },
    focusTime: {
      label: 'Focus Time %',
      dataKey: 'focusPercent',
      color: cssVar('--t-focus-high'),
      gradientId: 'focusGrad',
      formatter: (v) => `${v.toFixed(0)}%`,
      domain: [0, 100],
    },
    switches: {
      label: 'App Switches / min',
      dataKey: 'switchRate',
      color: cssVar('--t-focus-mid'),
      gradientId: 'switchGrad',
      formatter: (v) => v.toFixed(1),
    },
  };
}

function CustomTooltip({ active, payload, label }: any) {
  if (!active || !payload?.length) return null;
  return (
    <div className="glass-tooltip rounded-lg px-3 py-2 text-xs shadow-lg">
      <p className="text-fg-muted mb-1">{label}</p>
      {payload.map((p: any, i: number) => (
        <p key={i} style={{ color: p.color }} className="font-medium">
          {p.name}: {typeof p.value === 'number' ? p.value.toFixed(1) : p.value}
        </p>
      ))}
    </div>
  );
}

export function HistoryPage() {
  const navigate = useNavigate();
  const { theme } = useTheme();
  const [sessions, setSessions] = useState<Session[]>([]);
  const [chartMode, setChartMode] = useState<ChartMode>('fragmentation');
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [confirmingDeleteId, setConfirmingDeleteId] = useState<string | null>(null);

  const gridColor = cssVar('--t-overlay');
  const tickColor = cssVar('--t-fg-faint');
  const baseColor = cssVar('--t-base');
  const chartConfigs = getChartConfigs();

  useEffect(() => {
    window.attensa.session.getAll().then(setSessions);
  }, []);

  const handleDeleteClick = (e: React.MouseEvent, sessionId: string) => {
    e.stopPropagation();
    if (confirmingDeleteId === sessionId) {
      setConfirmingDeleteId(null);
      setDeletingId(sessionId);
      setTimeout(async () => {
        await window.attensa.session.delete(sessionId);
        setDeletingId(null);
        window.attensa.session.getAll().then(setSessions);
      }, 250);
    } else {
      setConfirmingDeleteId(sessionId);
      setTimeout(() => setConfirmingDeleteId((prev) => prev === sessionId ? null : prev), 3000);
    }
  };

  const chartData = sessions.map((s) => {
    const focusPercent = s.actualDurationMs > 0
      ? (s.totalFocusTimeMs / s.actualDurationMs) * 100
      : 0;
    const switchRate = s.actualDurationMs > 0
      ? s.appSwitchCount / (s.actualDurationMs / 60000)
      : 0;
    return {
      date: new Date(s.startedAt).toLocaleDateString(undefined, { month: 'short', day: 'numeric' }),
      fragmentation: s.focusFragmentationScore * 100,
      focusPercent,
      switchRate,
    };
  });

  const totalSessions = sessions.length;
  const totalFocusHours = sessions.reduce((sum, s) => sum + s.totalFocusTimeMs, 0) / 3600000;
  const avgFragmentation = totalSessions > 0
    ? sessions.reduce((sum, s) => sum + s.focusFragmentationScore, 0) / totalSessions * 100
    : 0;

  const recent5 = sessions.slice(-5);
  const prev5 = sessions.slice(-10, -5);
  const recentAvgFrag = recent5.length > 0
    ? recent5.reduce((s, x) => s + x.focusFragmentationScore, 0) / recent5.length * 100
    : 0;
  const prevAvgFrag = prev5.length > 0
    ? prev5.reduce((s, x) => s + x.focusFragmentationScore, 0) / prev5.length * 100
    : 0;
  const fragTrend = prev5.length > 0 ? recentAvgFrag - prevAvgFrag : 0;

  const config = chartConfigs[chartMode];

  const reversedSessions = [...sessions].reverse();

  return (
    <div className="min-h-screen px-6 sm:px-10 py-6 sm:py-8">
      <h1 className="text-2xl font-bold text-fg mb-6">History</h1>

      {/* Stats overview */}
      <div className="grid grid-cols-3 gap-3 mb-6">
        <div className="bg-surface rounded-xl p-3 text-center">
          <p className="text-2xl font-bold text-fg">{totalSessions}</p>
          <p className="text-xs text-fg-faint">Sessions</p>
        </div>
        <div className="bg-surface rounded-xl p-3 text-center">
          <p className="text-2xl font-bold text-fg">{totalFocusHours.toFixed(1)}</p>
          <p className="text-xs text-fg-faint">Hours focused</p>
        </div>
        <div className="bg-surface rounded-xl p-3 text-center">
          <p className="text-2xl font-bold text-fg">
            {avgFragmentation.toFixed(0)}
          </p>
          <p className="text-xs text-fg-faint">
            Avg frag.
            {prev5.length > 0 && (
              <span className={`ml-1 ${fragTrend < 0 ? 'text-focus-high' : fragTrend > 0 ? 'text-focus-low' : 'text-fg-faint'}`}>
                {fragTrend < 0 ? '\u2193' : fragTrend > 0 ? '\u2191' : ''}
              </span>
            )}
          </p>
        </div>
      </div>

      {/* Chart */}
      {chartData.length >= 2 && (
        <div className="mb-8">
          <div className="flex gap-1 mb-4">
            {(Object.keys(chartConfigs) as ChartMode[]).map((mode) => (
              <button
                key={mode}
                onClick={() => setChartMode(mode)}
                className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                  chartMode === mode
                    ? 'bg-overlay text-fg'
                    : 'text-fg-faint hover:text-fg'
                }`}
              >
                {chartConfigs[mode].label}
              </button>
            ))}
          </div>

          <div className="bg-surface rounded-xl p-4" style={{ height: 220 }}>
            <ResponsiveContainer width="100%" height="100%">
              {chartMode === 'switches' ? (
                <BarChart data={chartData} margin={{ top: 5, right: 5, bottom: 0, left: -20 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke={gridColor} />
                  <XAxis
                    dataKey="date"
                    tick={{ fontSize: 10, fill: tickColor }}
                    axisLine={{ stroke: gridColor }}
                    tickLine={false}
                  />
                  <YAxis
                    tick={{ fontSize: 10, fill: tickColor }}
                    axisLine={false}
                    tickLine={false}
                  />
                  <Tooltip content={<CustomTooltip />} />
                  <Bar
                    dataKey={config.dataKey}
                    name={config.label}
                    fill={config.color}
                    radius={[4, 4, 0, 0]}
                    maxBarSize={24}
                  />
                </BarChart>
              ) : (
                <AreaChart data={chartData} margin={{ top: 5, right: 5, bottom: 0, left: -20 }}>
                  <defs>
                    <linearGradient id={config.gradientId} x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor={config.color} stopOpacity={0.3} />
                      <stop offset="95%" stopColor={config.color} stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke={gridColor} />
                  <XAxis
                    dataKey="date"
                    tick={{ fontSize: 10, fill: tickColor }}
                    axisLine={{ stroke: gridColor }}
                    tickLine={false}
                  />
                  <YAxis
                    domain={config.domain}
                    tick={{ fontSize: 10, fill: tickColor }}
                    axisLine={false}
                    tickLine={false}
                  />
                  <Tooltip content={<CustomTooltip />} />
                  <Area
                    type="monotone"
                    dataKey={config.dataKey}
                    name={config.label}
                    stroke={config.color}
                    strokeWidth={2}
                    fill={`url(#${config.gradientId})`}
                    dot={{ r: 3, fill: config.color, strokeWidth: 0 }}
                    activeDot={{ r: 5, fill: config.color, strokeWidth: 2, stroke: baseColor }}
                  />
                </AreaChart>
              )}
            </ResponsiveContainer>
          </div>
        </div>
      )}

      {/* Monthly recaps */}
      {sessions.length > 0 && (() => {
        const months = new Map<string, number>();
        for (const s of sessions) {
          const d = new Date(s.startedAt);
          const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
          months.set(key, (months.get(key) || 0) + 1);
        }
        return (
          <div className="mb-6">
            <h2 className="text-sm font-medium text-fg-muted uppercase tracking-wider mb-3">
              Monthly Recaps
            </h2>
            <div className="flex flex-wrap gap-2">
              {[...months.entries()].reverse().map(([ym, count]) => (
                <button
                  key={ym}
                  onClick={() => navigate(`/recap/${ym}`)}
                  className="px-3 py-1.5 bg-surface rounded-lg text-xs text-fg hover:bg-overlay transition-colors"
                >
                  {ym} <span className="text-fg-faint ml-1">{count} sessions</span>
                </button>
              ))}
            </div>
          </div>
        );
      })()}

      {/* Session list */}
      {reversedSessions.length > 0 ? (
        <div>
          <h2 className="text-sm font-medium text-fg-muted uppercase tracking-wider mb-3">
            All Sessions ({totalSessions})
          </h2>
          <div className="space-y-2">
            {reversedSessions.map((session, index) => {
              const focusPct = session.actualDurationMs > 0
                ? Math.round((session.totalFocusTimeMs / session.actualDurationMs) * 100)
                : 0;
              const qualifies = focusPct >= 80 && session.focusFragmentationScore * 100 < 40;

              return (
                <div
                  key={session.id}
                  style={{ animation: `card-enter 400ms var(--ease-out) ${index * 30}ms both` }}
                  className={`relative group rounded-lg bg-surface border border-[var(--t-border-subtle)] shadow-surface hover:shadow-overlay hover:border-[var(--t-border-medium)] hover:-translate-y-px transition-all duration-250 ${
                    deletingId === session.id
                      ? 'opacity-0 scale-95'
                      : 'opacity-100 scale-100'
                  }`}
                >
                  <button
                    onClick={() => navigate(`/session/${session.id}/summary`)}
                    className="w-full py-3 px-4 text-left flex items-center justify-between hover:bg-overlay rounded-lg transition-colors"
                  >
                    <div className="flex items-center gap-3">
                      {qualifies && (
                        <span className="text-focus-mid text-xs" title="Streak point">
                          <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
                            <path d="M12 2C12 2 7.5 7 7.5 11.5C7.5 14 9 16.5 12 17.5C15 16.5 16.5 14 16.5 11.5C16.5 7 12 2 12 2Z" />
                          </svg>
                        </span>
                      )}
                      <div>
                        <p className="text-sm font-medium text-fg">
                          {new Date(session.startedAt).toLocaleDateString(undefined, {
                            weekday: 'short',
                            month: 'short',
                            day: 'numeric',
                            hour: 'numeric',
                            minute: '2-digit',
                          })}
                        </p>
                        <p className="text-xs text-fg-muted">
                          {Math.round(session.actualDurationMs / 60000)} min
                          <span className="text-fg-faint mx-1">&middot;</span>
                          {focusPct}% focus
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      <span className="text-xs text-fg-faint">
                        {session.appSwitchCount} sw
                      </span>
                      {(() => {
                        const focusScore = Math.round((1 - session.focusFragmentationScore) * 100);
                        return (
                          <span
                            className={`text-xs font-medium px-2 py-0.5 rounded-full ${
                              focusScore >= 65
                                ? 'bg-focus-high/20 text-focus-high'
                                : focusScore >= 35
                                  ? 'bg-focus-mid/20 text-focus-mid'
                                  : 'bg-focus-low/20 text-focus-low'
                            }`}
                          >
                            {focusScore}
                          </span>
                        );
                      })()}
                    </div>
                  </button>

                  <button
                    onClick={(e) => handleDeleteClick(e, session.id)}
                    className={`absolute right-1 top-1 rounded-md transition-all ${
                      confirmingDeleteId === session.id
                        ? 'opacity-100 px-2 py-1 bg-focus-low/20 text-focus-low text-xs font-medium'
                        : 'opacity-0 group-hover:opacity-100 p-1.5 hover:bg-focus-low/20 text-fg-faint hover:text-focus-low'
                    }`}
                    title={confirmingDeleteId === session.id ? 'Click again to confirm' : 'Delete session'}
                  >
                    {confirmingDeleteId === session.id ? (
                      'Delete?'
                    ) : (
                      <svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round">
                        <path d="M3 3l8 8M11 3l-8 8" />
                      </svg>
                    )}
                  </button>
                </div>
              );
            })}
          </div>
        </div>
      ) : (
        <p className="text-sm text-fg-faint text-center mt-12">
          No sessions yet. Start your first focus session!
        </p>
      )}
    </div>
  );
}
