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

const CHART_CONFIGS: Record<ChartMode, {
  label: string;
  dataKey: string;
  color: string;
  gradientId: string;
  formatter: (v: number) => string;
  domain?: [number, number];
}> = {
  fragmentation: {
    label: 'Fragmentation Score',
    dataKey: 'fragmentation',
    color: '#c4a7e7',
    gradientId: 'fragGrad',
    formatter: (v) => `${v.toFixed(0)}`,
    domain: [0, 100],
  },
  focusTime: {
    label: 'Focus Time %',
    dataKey: 'focusPercent',
    color: '#9ccfd8',
    gradientId: 'focusGrad',
    formatter: (v) => `${v.toFixed(0)}%`,
    domain: [0, 100],
  },
  switches: {
    label: 'App Switches / min',
    dataKey: 'switchRate',
    color: '#f6c177',
    gradientId: 'switchGrad',
    formatter: (v) => v.toFixed(1),
  },
};

function CustomTooltip({ active, payload, label }: any) {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-overlay border border-hl-med rounded-lg px-3 py-2 text-xs shadow-lg">
      <p className="text-subtle mb-1">{label}</p>
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
  const [sessions, setSessions] = useState<Session[]>([]);
  const [chartMode, setChartMode] = useState<ChartMode>('fragmentation');
  const [deletingId, setDeletingId] = useState<string | null>(null);

  useEffect(() => {
    window.attensa.session.getAll().then(setSessions);
  }, []);

  const handleDelete = async (e: React.MouseEvent, sessionId: string) => {
    e.stopPropagation();
    setDeletingId(sessionId);
    setTimeout(async () => {
      await window.attensa.session.delete(sessionId);
      setDeletingId(null);
      window.attensa.session.getAll().then(setSessions);
    }, 250);
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

  const config = CHART_CONFIGS[chartMode];

  const reversedSessions = [...sessions].reverse();

  return (
    <div className="min-h-screen px-6 py-8 max-w-lg mx-auto">
      <button
        onClick={() => navigate('/')}
        className="text-sm text-muted hover:text-fg mb-6 transition-colors"
      >
        Back
      </button>

      <h1 className="text-2xl font-bold text-fg mb-6">History</h1>

      {/* Stats overview */}
      <div className="grid grid-cols-3 gap-3 mb-6">
        <div className="bg-surface rounded-xl p-3 text-center">
          <p className="text-2xl font-bold text-fg">{totalSessions}</p>
          <p className="text-xs text-muted">Sessions</p>
        </div>
        <div className="bg-surface rounded-xl p-3 text-center">
          <p className="text-2xl font-bold text-fg">{totalFocusHours.toFixed(1)}</p>
          <p className="text-xs text-muted">Hours focused</p>
        </div>
        <div className="bg-surface rounded-xl p-3 text-center">
          <p className="text-2xl font-bold text-fg">
            {avgFragmentation.toFixed(0)}
          </p>
          <p className="text-xs text-muted">
            Avg frag.
            {prev5.length > 0 && (
              <span className={`ml-1 ${fragTrend < 0 ? 'text-foam' : fragTrend > 0 ? 'text-love' : 'text-muted'}`}>
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
            {(Object.keys(CHART_CONFIGS) as ChartMode[]).map((mode) => (
              <button
                key={mode}
                onClick={() => setChartMode(mode)}
                className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                  chartMode === mode
                    ? 'bg-overlay text-fg'
                    : 'text-muted hover:text-fg'
                }`}
              >
                {CHART_CONFIGS[mode].label}
              </button>
            ))}
          </div>

          <div className="bg-surface rounded-xl p-4" style={{ height: 220 }}>
            <ResponsiveContainer width="100%" height="100%">
              {chartMode === 'switches' ? (
                <BarChart data={chartData} margin={{ top: 5, right: 5, bottom: 0, left: -20 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#393552" />
                  <XAxis
                    dataKey="date"
                    tick={{ fontSize: 10, fill: '#6e6a86' }}
                    axisLine={{ stroke: '#393552' }}
                    tickLine={false}
                  />
                  <YAxis
                    tick={{ fontSize: 10, fill: '#6e6a86' }}
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
                  <CartesianGrid strokeDasharray="3 3" stroke="#393552" />
                  <XAxis
                    dataKey="date"
                    tick={{ fontSize: 10, fill: '#6e6a86' }}
                    axisLine={{ stroke: '#393552' }}
                    tickLine={false}
                  />
                  <YAxis
                    domain={config.domain}
                    tick={{ fontSize: 10, fill: '#6e6a86' }}
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
                    activeDot={{ r: 5, fill: config.color, strokeWidth: 2, stroke: '#232136' }}
                  />
                </AreaChart>
              )}
            </ResponsiveContainer>
          </div>
        </div>
      )}

      {/* Session list */}
      {reversedSessions.length > 0 ? (
        <div>
          <h2 className="text-sm font-medium text-subtle uppercase tracking-wider mb-3">
            All Sessions ({totalSessions})
          </h2>
          <div className="space-y-2">
            {reversedSessions.map((session) => {
              const focusPct = session.actualDurationMs > 0
                ? Math.round((session.totalFocusTimeMs / session.actualDurationMs) * 100)
                : 0;
              const qualifies = focusPct >= 80 && session.focusFragmentationScore * 100 < 40;

              return (
                <div
                  key={session.id}
                  className={`relative group rounded-lg bg-surface transition-all duration-250 ${
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
                        <span className="text-gold text-xs" title="Streak point">
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
                        <p className="text-xs text-subtle">
                          {Math.round(session.actualDurationMs / 60000)} min
                          <span className="text-muted mx-1">&middot;</span>
                          {focusPct}% focus
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      <span className="text-xs text-muted">
                        {session.appSwitchCount} sw
                      </span>
                      <span
                        className={`text-xs font-medium px-2 py-0.5 rounded-full ${
                          session.focusFragmentationScore < 0.3
                            ? 'bg-foam/20 text-foam'
                            : session.focusFragmentationScore < 0.6
                              ? 'bg-gold/20 text-gold'
                              : 'bg-love/20 text-love'
                        }`}
                      >
                        {(session.focusFragmentationScore * 100).toFixed(0)}
                      </span>
                    </div>
                  </button>

                  <button
                    onClick={(e) => handleDelete(e, session.id)}
                    className="absolute right-1 top-1 p-1.5 rounded-md opacity-0 group-hover:opacity-100 hover:bg-love/20 text-muted hover:text-love transition-all"
                    title="Delete session"
                  >
                    <svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round">
                      <path d="M3 3l8 8M11 3l-8 8" />
                    </svg>
                  </button>
                </div>
              );
            })}
          </div>
        </div>
      ) : (
        <p className="text-sm text-muted text-center mt-12">
          No sessions yet. Start your first focus session!
        </p>
      )}
    </div>
  );
}
