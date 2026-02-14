import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useSessionStore } from '../stores/session-store';
import { DURATION_OPTIONS } from '@attensa/shared';

function computeStreak(sessions: any[]): { points: number; consecutive: number } {
  let points = 0;
  let consecutiveFails = 0;

  const sorted = [...sessions].sort((a, b) => a.startedAt - b.startedAt);

  for (const s of sorted) {
    const focusPercent = s.actualDurationMs > 0
      ? s.totalFocusTimeMs / s.actualDurationMs
      : 0;
    const fragScore = s.focusFragmentationScore * 100;
    const qualifies = focusPercent >= 0.8 && fragScore < 40;

    if (qualifies) {
      points++;
      consecutiveFails = 0;
    } else {
      consecutiveFails++;
      if (consecutiveFails >= 2) {
        points = 0;
        consecutiveFails = 0;
      }
    }
  }

  return { points, consecutive: consecutiveFails };
}

function FlameIcon({ points }: { points: number }) {
  const intensity = Math.min(points / 10, 1);
  const size = 28 + intensity * 16;
  const glowOpacity = 0.15 + intensity * 0.5;
  const flameColor = points === 0
    ? '#6e6a86'
    : `hsl(${30 - intensity * 20}, ${80 + intensity * 20}%, ${50 + intensity * 15}%)`;

  return (
    <div className="relative flex items-center justify-center" style={{ width: 52, height: 52 }}>
      {points > 0 && (
        <div
          className="absolute rounded-full animate-pulse"
          style={{
            width: size + 20,
            height: size + 20,
            background: `radial-gradient(circle, ${flameColor}${Math.round(glowOpacity * 255).toString(16).padStart(2, '0')} 0%, transparent 70%)`,
          }}
        />
      )}
      <svg
        width={size}
        height={size}
        viewBox="0 0 24 24"
        fill="none"
        style={{ position: 'relative', zIndex: 1, filter: points > 3 ? `drop-shadow(0 0 ${4 + intensity * 8}px ${flameColor})` : 'none' }}
      >
        <path
          d="M12 2C12 2 7.5 7 7.5 11.5C7.5 14 9 16.5 12 17.5C15 16.5 16.5 14 16.5 11.5C16.5 7 12 2 12 2Z"
          fill={flameColor}
          opacity={points > 0 ? 0.9 : 0.3}
        />
        <path
          d="M12 8C12 8 10 10.5 10 12.5C10 14 11 15 12 15.5C13 15 14 14 14 12.5C14 10.5 12 8 12 8Z"
          fill={points > 0 ? '#f6c177' : '#6e6a86'}
          opacity={points > 0 ? 0.8 : 0.2}
        />
        {points > 5 && (
          <path
            d="M12 10C12 10 11 11.5 11 12.5C11 13.5 11.5 14 12 14.2C12.5 14 13 13.5 13 12.5C13 11.5 12 10 12 10Z"
            fill="#fae8c8"
            opacity={0.9}
          />
        )}
      </svg>
    </div>
  );
}

export function HomePage() {
  const [selectedDuration, setSelectedDuration] = useState<number | null>(null);
  const [customMinutes, setCustomMinutes] = useState('');
  const [showCustom, setShowCustom] = useState(false);
  const [recentSessions, setRecentSessions] = useState<any[]>([]);
  const [allSessions, setAllSessions] = useState<any[]>([]);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const { startSession } = useSessionStore();
  const navigate = useNavigate();

  const loadSessions = useCallback(() => {
    window.attensa.session.getRecent(5).then(setRecentSessions);
    window.attensa.session.getAll().then(setAllSessions);
  }, []);

  useEffect(() => {
    loadSessions();
  }, [loadSessions]);

  const streak = computeStreak(allSessions);

  const handleCustomSelect = () => {
    const mins = parseInt(customMinutes, 10);
    if (mins > 0 && mins <= 480) {
      setSelectedDuration(mins * 60 * 1000);
      setShowCustom(false);
    }
  };

  const handleStart = async () => {
    if (!selectedDuration) return;
    await startSession(selectedDuration);
    navigate('/session/active');
  };

  const handleDelete = async (e: React.MouseEvent, sessionId: string) => {
    e.stopPropagation();
    setDeletingId(sessionId);
    setTimeout(async () => {
      await window.attensa.session.delete(sessionId);
      setDeletingId(null);
      loadSessions();
    }, 250);
  };

  const isCustomSelected = selectedDuration !== null
    && !DURATION_OPTIONS.some((opt) => opt.ms === selectedDuration);

  return (
    <div className="flex flex-col items-center justify-center min-h-screen px-8 py-12">
      {/* Header with streak */}
      <div className="flex items-center gap-3 mb-2">
        <h1 className="text-3xl font-bold text-fg">Attensa</h1>
        <div className="relative group cursor-default">
          <FlameIcon points={streak.points} />
          <div className="absolute -bottom-8 left-1/2 -translate-x-1/2 text-xs text-subtle opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap">
            {streak.points > 0 ? `${streak.points} streak` : 'No streak'}
          </div>
        </div>
      </div>
      <p className="text-subtle mb-10">Focus Analytics</p>

      {/* Duration presets */}
      <div className="w-full max-w-sm space-y-3 mb-4">
        {DURATION_OPTIONS.map((opt) => (
          <button
            key={opt.ms}
            onClick={() => { setSelectedDuration(opt.ms); setShowCustom(false); }}
            className={`w-full py-4 px-6 rounded-xl text-left transition-all border-2 ${
              selectedDuration === opt.ms && !isCustomSelected
                ? 'border-iris bg-iris/10'
                : 'border-overlay bg-surface hover:border-hl-med'
            }`}
          >
            <span className="text-lg font-medium text-fg">{opt.label}</span>
            <span className="text-subtle ml-2">{opt.minutes} min</span>
          </button>
        ))}

        {/* Custom duration */}
        {!showCustom ? (
          <button
            onClick={() => setShowCustom(true)}
            className={`w-full py-4 px-6 rounded-xl text-left transition-all border-2 ${
              isCustomSelected
                ? 'border-iris bg-iris/10'
                : 'border-overlay bg-surface hover:border-hl-med'
            }`}
          >
            <span className="text-lg font-medium text-fg">Custom</span>
            {isCustomSelected && (
              <span className="text-subtle ml-2">
                {Math.round(selectedDuration! / 60000)} min
              </span>
            )}
          </button>
        ) : (
          <div className="w-full py-3 px-5 rounded-xl border-2 border-iris bg-iris/10 flex items-center gap-3">
            <input
              type="number"
              min={1}
              max={480}
              value={customMinutes}
              onChange={(e) => setCustomMinutes(e.target.value)}
              onKeyDown={(e) => { if (e.key === 'Enter') handleCustomSelect(); }}
              placeholder="Minutes"
              autoFocus
              className="flex-1 bg-transparent text-lg font-medium text-fg outline-none placeholder-muted [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
            />
            <span className="text-subtle text-sm">min</span>
            <button
              onClick={handleCustomSelect}
              disabled={!customMinutes || parseInt(customMinutes) < 1}
              className="px-3 py-1.5 bg-iris text-base rounded-lg text-sm font-medium transition-all hover:brightness-110 disabled:opacity-40"
            >
              Set
            </button>
          </div>
        )}
      </div>

      <button
        onClick={handleStart}
        disabled={!selectedDuration}
        className="w-full max-w-sm py-4 rounded-xl font-semibold text-lg transition-all bg-iris text-base hover:brightness-110 disabled:opacity-40 disabled:cursor-not-allowed mb-4"
      >
        Start Focus Time
      </button>

      {/* Recent sessions */}
      {recentSessions.length > 0 && (
        <div className="w-full max-w-sm mt-6">
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-sm font-medium text-subtle uppercase tracking-wider">
              Recent Sessions
            </h2>
            <button
              onClick={() => navigate('/history')}
              className="text-xs text-iris hover:text-iris/80 transition-colors"
            >
              View all
            </button>
          </div>
          <div className="space-y-2">
            {recentSessions.map((session) => (
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
                  <div>
                    <p className="text-sm font-medium text-fg">
                      {new Date(session.startedAt).toLocaleDateString(undefined, {
                        month: 'short',
                        day: 'numeric',
                        hour: 'numeric',
                        minute: '2-digit',
                      })}
                    </p>
                    <p className="text-xs text-subtle">
                      {Math.round(session.actualDurationMs / 60000)} min
                    </p>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="text-xs text-muted">
                      {session.appSwitchCount} switches
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
            ))}
          </div>
        </div>
      )}

      <div className="flex gap-4 mt-6">
        <button
          onClick={() => navigate('/history')}
          className="text-sm text-muted hover:text-fg transition-colors"
        >
          History
        </button>
        <button
          onClick={() => navigate('/settings')}
          className="text-sm text-muted hover:text-fg transition-colors"
        >
          Settings
        </button>
      </div>
    </div>
  );
}
