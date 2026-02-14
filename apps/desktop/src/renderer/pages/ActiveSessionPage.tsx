import { useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useSessionStore } from '../stores/session-store';

function formatTime(ms: number): string {
  const totalSeconds = Math.max(0, Math.ceil(ms / 1000));
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
}

const TICK_COUNT = 60;
const CENTER = 150;
const PIE_RADIUS = 52.5;
const PIE_CIRCUMFERENCE = 2 * Math.PI * PIE_RADIUS;

function getAccentHex(progress: number): string {
  if (progress < 0.5) return '#9ccfd8'; // foam
  if (progress < 0.75) return '#f6c177'; // gold
  return '#eb6f92'; // love
}

function getAccentClass(progress: number): string {
  if (progress < 0.5) return 'text-foam';
  if (progress < 0.75) return 'text-gold';
  return 'text-love';
}

function TickMarks({ accentColor }: { accentColor: string }) {
  const ticks = [];
  for (let i = 0; i < TICK_COUNT; i++) {
    const angle = (i / TICK_COUNT) * 2 * Math.PI - Math.PI / 2;
    const isMajor = i % 5 === 0;
    const innerR = isMajor ? 126 : 129;
    const outerR = isMajor ? 140 : 137;
    ticks.push(
      <line
        key={i}
        x1={CENTER + innerR * Math.cos(angle)}
        y1={CENTER + innerR * Math.sin(angle)}
        x2={CENTER + outerR * Math.cos(angle)}
        y2={CENTER + outerR * Math.sin(angle)}
        stroke={accentColor}
        strokeWidth={isMajor ? 2 : 1}
        opacity={isMajor ? 0.6 : 0.2}
        strokeLinecap="round"
      />
    );
  }
  return <>{ticks}</>;
}

export function ActiveSessionPage() {
  const {
    isActive,
    sessionId,
    remainingMs,
    plannedDurationMs,
    appSwitchCount,
    currentApp,
    updateTick,
    stopSession,
    cancelSession,
  } = useSessionStore();
  const navigate = useNavigate();

  const autoStopTriggered = useRef(false);

  useEffect(() => {
    const unsubTick = window.attensa.session.onTick(updateTick);
    const unsubEnd = window.attensa.session.onEnd((endedSessionId: string) => {
      useSessionStore.setState({ isActive: false });
      navigate(`/session/${endedSessionId}/summary`);
    });

    return () => {
      unsubTick();
      unsubEnd();
    };
  }, [updateTick, navigate]);

  useEffect(() => {
    if (remainingMs <= 0 && isActive && plannedDurationMs > 0 && !autoStopTriggered.current) {
      autoStopTriggered.current = true;
      stopSession().then(() => {
        if (sessionId) {
          navigate(`/session/${sessionId}/summary`);
        }
      });
    }
  }, [remainingMs, isActive, plannedDurationMs, sessionId, stopSession, navigate]);

  useEffect(() => {
    if (!isActive) {
      navigate('/');
    }
  }, [isActive, navigate]);

  const progress = plannedDurationMs > 0
    ? Math.max(0, Math.min(1, 1 - remainingMs / plannedDurationMs))
    : 0;

  const accentHex = getAccentHex(progress);
  const accentClass = getAccentClass(progress);
  const pieDashoffset = PIE_CIRCUMFERENCE * progress;

  const handleStop = async () => {
    await stopSession();
    if (sessionId) {
      navigate(`/session/${sessionId}/summary`);
    }
  };

  const handleCancel = async () => {
    await cancelSession();
    navigate('/');
  };

  return (
    <div className="flex flex-col items-center justify-center min-h-screen px-8">
      {/* Circular timer */}
      <div className="relative" style={{ width: 288, height: 288 }}>
        <svg viewBox="0 0 300 300" className="w-full h-full">
          <defs>
            <filter id="tickGlow">
              <feGaussianBlur stdDeviation="2" result="blur" />
              <feMerge>
                <feMergeNode in="blur" />
                <feMergeNode in="SourceGraphic" />
              </feMerge>
            </filter>
          </defs>

          {/* Tick marks with glow */}
          <g filter="url(#tickGlow)">
            <TickMarks accentColor={accentHex} />
          </g>

          {/* Outer thin ring */}
          <circle
            cx={CENTER}
            cy={CENTER}
            r={120}
            fill="none"
            stroke="#393552"
            strokeWidth="1.5"
          />

          {/* Inner circle base */}
          <circle
            cx={CENTER}
            cy={CENTER}
            r={105}
            fill="#2a273f"
          />

          {/* Pie countdown — thick stroke fills the circle area */}
          <circle
            cx={CENTER}
            cy={CENTER}
            r={PIE_RADIUS}
            fill="none"
            stroke={accentHex}
            strokeWidth={105}
            strokeDasharray={PIE_CIRCUMFERENCE}
            strokeDashoffset={pieDashoffset}
            transform={`rotate(-90 ${CENTER} ${CENTER})`}
            opacity={0.8}
            style={{
              transition: 'stroke-dashoffset 1s linear, stroke 0.5s ease',
            }}
          />

          {/* Center depth circle */}
          <circle
            cx={CENTER}
            cy={CENTER}
            r={35}
            fill="#232136"
            opacity={0.2}
          />
        </svg>
      </div>

      {/* Numerical timer below the circle */}
      <div className="flex flex-col items-center mt-5 mb-6">
        <span className={`text-4xl font-mono font-bold ${accentClass}`}
          style={{ transition: 'color 0.5s ease' }}
        >
          {formatTime(remainingMs)}
        </span>
        <span className="text-sm text-subtle mt-1">remaining</span>
      </div>

      {/* Stats */}
      <div className="flex gap-8 mb-8">
        <div className="text-center">
          <p className="text-2xl font-bold text-fg">{appSwitchCount}</p>
          <p className="text-xs text-subtle uppercase tracking-wider">Switches</p>
        </div>
        <div className="text-center max-w-[140px]">
          <p className="text-sm font-medium text-fg truncate">{currentApp || '...'}</p>
          <p className="text-xs text-subtle uppercase tracking-wider">Current App</p>
        </div>
      </div>

      {/* Actions */}
      <div className="flex gap-4">
        <button
          onClick={handleStop}
          className="px-6 py-2 rounded-lg bg-overlay hover:bg-hl-med text-fg text-sm font-medium transition-colors"
        >
          End Now
        </button>
        <button
          onClick={handleCancel}
          className="px-6 py-2 rounded-lg text-muted hover:text-fg text-sm font-medium transition-colors"
        >
          Cancel
        </button>
      </div>
    </div>
  );
}
