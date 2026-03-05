import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useSessionStore } from '../stores/session-store';
import { DURATION_OPTIONS } from '@attensa/shared';
import { TodoWidget } from '../components/TodoWidget';

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
  const deadColor = getComputedStyle(document.documentElement).getPropertyValue('--t-fg-faint').trim() || '#62656E';
  const flameColor = points === 0
    ? deadColor
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
          fill={points > 0 ? '#E4B76A' : deadColor}
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

const MOTIVATIONAL_QUOTES = [
  { text: 'The secret of getting ahead is getting started.', author: 'Mark Twain' },
  { text: 'Focus on being productive instead of busy.', author: 'Tim Ferriss' },
  { text: 'Where focus goes, energy flows.', author: 'Tony Robbins' },
  { text: 'Do the hard jobs first. The easy jobs will take care of themselves.', author: 'Dale Carnegie' },
  { text: "It's not that I'm so smart, it's just that I stay with problems longer.", author: 'Albert Einstein' },
  { text: 'The successful warrior is the average man, with laser-like focus.', author: 'Bruce Lee' },
  { text: 'Concentrate all your thoughts upon the work at hand.', author: 'Alexander Graham Bell' },
  { text: 'You can always find a distraction if you are looking for one.', author: 'Tom Kite' },
  { text: 'Deep work is the ability to focus without distraction on a cognitively demanding task.', author: 'Cal Newport' },
  { text: 'Starve your distractions, feed your focus.', author: 'Daniel Goleman' },
  { text: 'The mind is everything. What you think you become.', author: 'Buddha' },
  { text: 'Action is the foundational key to all success.', author: 'Pablo Picasso' },
  { text: 'Productivity is never an accident. It is always the result of commitment to excellence.', author: 'Paul J. Meyer' },
  { text: 'Until we can manage time, we can manage nothing else.', author: 'Peter Drucker' },
  { text: 'The key is not to prioritize your schedule, but to schedule your priorities.', author: 'Stephen Covey' },
  { text: 'Your attention is your most important resource. Spend it wisely.', author: 'Nir Eyal' },
  { text: 'You will never reach your destination if you stop and throw stones at every dog that barks.', author: 'Winston Churchill' },
  { text: 'Lack of direction, not lack of time, is the problem.', author: 'Zig Ziglar' },
  { text: 'The ability to simplify means to eliminate the unnecessary so that the necessary may speak.', author: 'Hans Hofmann' },
  { text: 'Efficiency is doing things right; effectiveness is doing the right things.', author: 'Peter Drucker' },
  { text: 'Time is what we want most, but what we use worst.', author: 'William Penn' },
  { text: 'A year from now you may wish you had started today.', author: 'Karen Lamb' },
  { text: 'The only way to do great work is to love what you do.', author: 'Steve Jobs' },
  { text: 'Start where you are. Use what you have. Do what you can.', author: 'Arthur Ashe' },
];


function getTodayFocusHours(sessions: any[]): number {
  const now = new Date();
  const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
  return sessions
    .filter((s) => s.startedAt >= startOfDay)
    .reduce((sum, s) => sum + (s.totalFocusTimeMs || 0), 0) / 3600000;
}

function getAttentionScore(sessions: any[]): number | null {
  const recent = [...sessions]
    .sort((a, b) => b.startedAt - a.startedAt)
    .slice(0, 7)
    .filter((s) => s.actualDurationMs > 0);
  if (recent.length === 0) return null;
  const avg = recent.reduce((sum, s) => sum + (1 - s.focusFragmentationScore), 0) / recent.length;
  return Math.round(avg * 100);
}

function useScrambleText(target: string, { duration = 1200, charset = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789!@#$%&*' } = {}) {
  const [display, setDisplay] = useState(target.split('').map(() => charset[Math.floor(Math.random() * charset.length)]).join(''));
  const [done, setDone] = useState(false);

  useEffect(() => {
    const len = target.length;
    const perChar = duration / len;
    let resolved = 0;
    let frame: number;

    const scramble = () => {
      setDisplay(() => {
        let out = '';
        for (let i = 0; i < len; i++) {
          out += i < resolved ? target[i] : charset[Math.floor(Math.random() * charset.length)];
        }
        return out;
      });
      frame = requestAnimationFrame(scramble);
    };

    frame = requestAnimationFrame(scramble);

    const timers: ReturnType<typeof setTimeout>[] = [];
    for (let i = 0; i < len; i++) {
      timers.push(setTimeout(() => {
        resolved = i + 1;
        if (i === len - 1) {
          cancelAnimationFrame(frame);
          setDisplay(target);
          setDone(true);
        }
      }, 300 + perChar * i));
    }

    return () => {
      cancelAnimationFrame(frame);
      timers.forEach(clearTimeout);
    };
  }, [target, duration, charset]);

  return { display, done };
}

export function HomePage() {
  const [selectedDuration, setSelectedDuration] = useState<number | null>(null);
  const [customMinutes, setCustomMinutes] = useState('');
  const [showCustom, setShowCustom] = useState(false);
  const [recentSessions, setRecentSessions] = useState<any[]>([]);
  const [allSessions, setAllSessions] = useState<any[]>([]);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [confirmingDeleteId, setConfirmingDeleteId] = useState<string | null>(null);
  const { startSession } = useSessionStore();
  const navigate = useNavigate();
  const { display: scrambledTitle } = useScrambleText('attensa');

  const loadSessions = useCallback(() => {
    window.attensa.session.getRecent(5).then(setRecentSessions);
    window.attensa.session.getAll().then(setAllSessions);
  }, []);

  useEffect(() => {
    loadSessions();
  }, [loadSessions]);

  const streak = computeStreak(allSessions);
  const todayHours = getTodayFocusHours(allSessions);
  const attentionScore = getAttentionScore(allSessions);
  const [quoteIndex, setQuoteIndex] = useState(() => {
    const today = new Date();
    const dayOfYear = Math.floor(
      (today.getTime() - new Date(today.getFullYear(), 0, 0).getTime()) / 86400000
    );
    return dayOfYear % MOTIVATIONAL_QUOTES.length;
  });
  const quote = MOTIVATIONAL_QUOTES[quoteIndex];
  const swapQuote = () => {
    setQuoteIndex((prev) => (prev + 1) % MOTIVATIONAL_QUOTES.length);
  };

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

  const handleDeleteClick = (e: React.MouseEvent, sessionId: string) => {
    e.stopPropagation();
    if (confirmingDeleteId === sessionId) {
      setConfirmingDeleteId(null);
      setDeletingId(sessionId);
      setTimeout(async () => {
        await window.attensa.session.delete(sessionId);
        setDeletingId(null);
        loadSessions();
      }, 250);
    } else {
      setConfirmingDeleteId(sessionId);
      setTimeout(() => setConfirmingDeleteId((prev) => prev === sessionId ? null : prev), 3000);
    }
  };

  const isCustomSelected = selectedDuration !== null
    && !DURATION_OPTIONS.some((opt) => opt.ms === selectedDuration);

  return (
    <div className="flex flex-col items-center min-h-screen px-6 sm:px-8 pt-10 sm:pt-14 pb-12">
      {/* Scramble Title */}
      <h1
        className="text-3xl sm:text-4xl font-bold text-fg tracking-tight mb-1 cursor-default select-none font-mono"
        style={{ animation: 'page-fade-in 600ms var(--ease-out) both' }}
      >
        {scrambledTitle}
      </h1>
      <p className="text-fg-faint text-xs uppercase tracking-[0.2em] mb-8 sm:mb-10" style={{ animation: 'page-fade-in 600ms var(--ease-out) 100ms both' }}>
        Focus Analytics
      </p>

      {/* Hero + Todo — side by side */}
      <div className="w-full max-w-4xl grid grid-cols-1 lg:grid-cols-[1fr_280px] gap-4 mb-8 sm:mb-10" style={{ animation: 'card-enter 500ms var(--ease-out) both' }}>
        {/* Hero Widget */}
        <div className="rounded-2xl border border-[var(--t-border-light)] bg-surface p-5 shadow-surface">
          {/* Stats row: attention score | streak | hours */}
          <div className="grid grid-cols-3 gap-3 mb-4">
            {/* Attention Score */}
            <div className="flex flex-col items-center text-center">
              <div className={`text-2xl font-bold leading-none font-mono ${
                attentionScore === null
                  ? 'text-fg-faint'
                  : attentionScore >= 65
                    ? 'text-focus-high'
                    : attentionScore >= 35
                      ? 'text-focus-mid'
                      : 'text-focus-low'
              }`}>
                {attentionScore !== null ? attentionScore : '—'}
              </div>
              <p className="text-[11px] text-fg-faint mt-1">attention score</p>
            </div>

            {/* Divider + Streak + Divider */}
            <div className="flex items-center justify-center gap-3 border-x border-[var(--t-border-light)] px-2">
              <FlameIcon points={streak.points} />
              <div>
                <p className="text-2xl font-bold text-fg leading-none">
                  {streak.points}
                </p>
                <p className="text-[11px] text-fg-faint mt-1">streak</p>
              </div>
            </div>

            {/* Hours today */}
            <div className="flex flex-col items-center text-center">
              <p className="text-2xl font-bold text-fg leading-none font-mono">
                {todayHours < 10 ? todayHours.toFixed(1) : Math.round(todayHours)}
                <span className="text-sm font-sans font-medium text-fg-muted ml-1">h</span>
              </p>
              <p className="text-[11px] text-fg-faint mt-1">focused today</p>
            </div>
          </div>

          {/* Quote */}
          <div className="border-t border-[var(--t-border-light)] pt-3">
            <div className="flex items-start justify-between gap-2">
              <div className="min-w-0">
                <p className="text-sm text-fg-muted italic leading-relaxed">
                  "{quote.text}"
                </p>
                <p className="text-xs text-fg-faint mt-1">
                  — {quote.author}
                </p>
              </div>
              <button
                onClick={swapQuote}
                className="flex-shrink-0 p-1.5 rounded-md text-fg-faint hover:text-fg-muted hover:bg-overlay transition-colors mt-0.5"
                title="Next quote"
              >
                <svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M11.5 2.5v3.5h-3.5" />
                  <path d="M2.5 7a4.5 4.5 0 0 1 7.6-3.2l1.4 1.2" />
                  <path d="M2.5 11.5V8h3.5" />
                  <path d="M11.5 7a4.5 4.5 0 0 1-7.6 3.2L2.5 9" />
                </svg>
              </button>
            </div>
          </div>
        </div>

        {/* Todo Widget */}
        <TodoWidget />
      </div>

      {/* Duration presets */}
      <div className="w-full max-w-4xl space-y-3 mb-4">
        {DURATION_OPTIONS.map((opt) => (
          <button
            key={opt.ms}
            onClick={() => { setSelectedDuration(opt.ms); setShowCustom(false); }}
            className={`w-full py-4 px-6 rounded-xl text-left transition-all border ${
              selectedDuration === opt.ms && !isCustomSelected
                ? 'border-[var(--t-border-accent)] bg-[var(--t-bg-accent-tint)] shadow-overlay'
                : 'border-[var(--t-border-subtle)] bg-surface hover:border-[var(--t-border-hover)] shadow-surface'
            }`}
          >
            <span className="text-lg font-medium text-fg">{opt.label}</span>
            <span className="text-fg-muted ml-2">{opt.minutes} min</span>
          </button>
        ))}

        {/* Custom duration */}
        {!showCustom ? (
          <button
            onClick={() => setShowCustom(true)}
            className={`w-full py-4 px-6 rounded-xl text-left transition-all border ${
              isCustomSelected
                ? 'border-[var(--t-border-accent)] bg-[var(--t-bg-accent-tint)] shadow-overlay'
                : 'border-[var(--t-border-subtle)] bg-surface hover:border-[var(--t-border-hover)] shadow-surface'
            }`}
          >
            <span className="text-lg font-medium text-fg">Custom</span>
            {isCustomSelected && (
              <span className="text-fg-muted ml-2">
                {Math.round(selectedDuration! / 60000)} min
              </span>
            )}
          </button>
        ) : (
          <div className="w-full py-3 px-5 rounded-xl border border-[var(--t-border-accent)] bg-[var(--t-bg-accent-tint)] shadow-overlay flex items-center gap-3">
            <input
              type="number"
              min={1}
              max={480}
              value={customMinutes}
              onChange={(e) => setCustomMinutes(e.target.value)}
              onKeyDown={(e) => { if (e.key === 'Enter') handleCustomSelect(); }}
              placeholder="Minutes"
              autoFocus
              className="flex-1 bg-transparent text-lg font-medium text-fg outline-none placeholder-fg-faint [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
            />
            <span className="text-fg-muted text-sm">min</span>
            <button
              onClick={handleCustomSelect}
              disabled={!customMinutes || parseInt(customMinutes) < 1}
              className="px-3 py-1.5 bg-accent text-white rounded-lg text-sm font-medium transition-all hover:brightness-110 disabled:opacity-40"
            >
              Set
            </button>
          </div>
        )}
      </div>

      <button
        onClick={handleStart}
        disabled={!selectedDuration}
        className="w-full max-w-4xl py-4 rounded-xl font-semibold text-lg transition-all bg-gradient-to-br from-accent to-accent-dim text-white shadow-[0_2px_8px_rgba(123,143,255,0.25),inset_0_1px_0_rgba(255,255,255,0.1)] hover:-translate-y-px hover:shadow-[0_4px_12px_rgba(123,143,255,0.35)] active:translate-y-0 active:shadow-[0_1px_4px_rgba(123,143,255,0.2)] disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:translate-y-0 disabled:hover:shadow-[0_2px_8px_rgba(123,143,255,0.25)] mb-4"
      >
        Start Focus Time
      </button>

      {/* Recent sessions */}
      {recentSessions.length > 0 && (
        <div className="w-full max-w-4xl mt-6">
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-sm font-medium text-fg-muted uppercase tracking-wider">
              Recent Sessions
            </h2>
            <button
              onClick={() => navigate('/history')}
              className="text-xs text-accent hover:text-accent/80 transition-colors"
            >
              View all
            </button>
          </div>
          <div className="space-y-2">
            {recentSessions.map((session, index) => (
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
                  <div>
                    <p className="text-sm font-medium text-fg">
                      {new Date(session.startedAt).toLocaleDateString(undefined, {
                        month: 'short',
                        day: 'numeric',
                        hour: 'numeric',
                        minute: '2-digit',
                      })}
                    </p>
                    <p className="text-xs text-fg-muted">
                      {Math.round(session.actualDurationMs / 60000)} min
                    </p>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="text-xs text-fg-faint">
                      {session.appSwitchCount} switches
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
            ))}
          </div>
        </div>
      )}

    </div>
  );
}
