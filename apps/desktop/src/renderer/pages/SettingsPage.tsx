import { useState, useEffect } from 'react';
import { useTheme } from '../components/ThemeContext';

export function SettingsPage() {
  const { theme, toggle } = useTheme();
  const [apiKey, setApiKey] = useState('');
  const [saved, setSaved] = useState(false);
  const [showKey, setShowKey] = useState(false);
  useEffect(() => {
    window.attensa.settings.get().then((s: any) => {
      setApiKey(s?.geminiApiKey || '');
    });
  }, []);

  const handleSaveKey = async () => {
    await window.attensa.settings.set('geminiApiKey', apiKey.trim());
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  const handleResetConsent = async () => {
    await window.attensa.settings.set('consentAccepted', false);
    window.location.reload();
  };

  return (
    <div className="min-h-screen px-6 sm:px-10 py-6 sm:py-8">
      <h1 className="text-2xl font-bold text-fg mb-8">Settings</h1>

      {/* Gemini API Key */}
      <div className="mb-8">
        <h2 className="text-sm font-medium text-fg-muted uppercase tracking-wider mb-3">
          AI Insights
        </h2>
        <label className="block text-sm text-fg mb-2">
          Gemini API Key
        </label>
        <p className="text-xs text-fg-faint mb-3">
          Required for AI-powered session insights and monthly recaps.
          Your key is stored locally and never shared.
        </p>
        <div className="flex gap-2">
          <div className="flex-1 relative">
            <input
              type={showKey ? 'text' : 'password'}
              value={apiKey}
              onChange={(e) => setApiKey(e.target.value)}
              placeholder="Enter your Gemini API key"
              className="w-full px-3 py-2 pr-9 bg-surface border border-fg-ghost rounded-lg text-sm text-fg placeholder-fg-faint focus:outline-none focus:border-accent transition-colors"
            />
            <button
              type="button"
              onClick={() => setShowKey(!showKey)}
              className="absolute right-2 top-1/2 -translate-y-1/2 text-fg-faint hover:text-fg transition-colors"
              title={showKey ? 'Hide key' : 'Show key'}
            >
              <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                {showKey ? (
                  <>
                    <path d="M2 8s2.5-4 6-4 6 4 6 4-2.5 4-6 4-6-4-6-4z" />
                    <circle cx="8" cy="8" r="2" />
                  </>
                ) : (
                  <>
                    <path d="M2 8s2.5-4 6-4 6 4 6 4-2.5 4-6 4-6-4-6-4z" />
                    <circle cx="8" cy="8" r="2" />
                    <path d="M3 13L13 3" />
                  </>
                )}
              </svg>
            </button>
          </div>
          <button
            onClick={handleSaveKey}
            className="px-4 py-2 bg-accent text-white rounded-lg text-sm font-medium transition-all hover:brightness-110"
          >
            {saved ? 'Saved' : 'Save'}
          </button>
        </div>
      </div>

      {/* Appearance */}
      <div className="mb-8">
        <h2 className="text-sm font-medium text-fg-muted uppercase tracking-wider mb-3">
          Appearance
        </h2>
        <div className="flex gap-3">
          <button
            onClick={theme === 'dark' ? undefined : toggle}
            className={`flex-1 flex flex-col items-center gap-2 p-4 rounded-xl border transition-all ${
              theme === 'dark'
                ? 'border-[var(--t-border-accent)] bg-[var(--t-bg-accent-tint)]'
                : 'border-[var(--t-border-subtle)] bg-surface hover:border-[var(--t-border-hover)]'
            }`}
          >
            <svg width="20" height="20" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M16.5 10.7A7.5 7.5 0 1 1 9.3 3.5a5.8 5.8 0 0 0 7.2 7.2z" />
            </svg>
            <span className="text-xs font-medium text-fg">Dark</span>
          </button>
          <button
            onClick={theme === 'light' ? undefined : toggle}
            className={`flex-1 flex flex-col items-center gap-2 p-4 rounded-xl border transition-all ${
              theme === 'light'
                ? 'border-[var(--t-border-accent)] bg-[var(--t-bg-accent-tint)]'
                : 'border-[var(--t-border-subtle)] bg-surface hover:border-[var(--t-border-hover)]'
            }`}
          >
            <svg width="20" height="20" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="10" cy="10" r="4" />
              <path d="M10 2v2M10 16v2M2 10h2M16 10h2M4.34 4.34l1.42 1.42M14.24 14.24l1.42 1.42M15.66 4.34l-1.42 1.42M5.76 14.24l-1.42 1.42" />
            </svg>
            <span className="text-xs font-medium text-fg">Light</span>
          </button>
        </div>
      </div>

      {/* Streak Rules */}
      <div className="mb-8">
        <h2 className="text-sm font-medium text-fg-muted uppercase tracking-wider mb-3">
          Streak Rules
        </h2>
        <div className="bg-surface rounded-xl border border-[var(--t-border-subtle)] p-4 space-y-3">
          <div className="flex items-start gap-3">
            <div className="mt-0.5 text-focus-high">
              <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                <path d="M13.5 4.5L6 12l-3.5-3.5" />
              </svg>
            </div>
            <div>
              <p className="text-sm text-fg font-medium">Earn a streak point</p>
              <p className="text-xs text-fg-faint mt-0.5">
                Focus time must be at least <span className="text-fg-muted font-medium">80%</span> of the session
                and fragmentation score below <span className="text-fg-muted font-medium">40</span>.
              </p>
            </div>
          </div>
          <div className="flex items-start gap-3">
            <div className="mt-0.5 text-focus-low">
              <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                <path d="M4 4l8 8M12 4l-8 8" />
              </svg>
            </div>
            <div>
              <p className="text-sm text-fg font-medium">Streak resets</p>
              <p className="text-xs text-fg-faint mt-0.5">
                Two consecutive sessions that don't qualify will reset your streak to <span className="text-fg-muted font-medium">0</span>.
                One miss is forgiven.
              </p>
            </div>
          </div>
          <div className="flex items-start gap-3">
            <div className="mt-0.5 text-accent">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor" opacity="0.7">
                <path d="M12 2C12 2 7.5 7 7.5 11.5C7.5 14 9 16.5 12 17.5C15 16.5 16.5 14 16.5 11.5C16.5 7 12 2 12 2Z" />
              </svg>
            </div>
            <div>
              <p className="text-sm text-fg font-medium">Flame grows with streak</p>
              <p className="text-xs text-fg-faint mt-0.5">
                The flame icon on the home page grows brighter and larger as your streak increases.
                It reaches full intensity at <span className="text-fg-muted font-medium">10</span> points.
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Privacy */}
      <div className="mb-8">
        <h2 className="text-sm font-medium text-fg-muted uppercase tracking-wider mb-3">
          Privacy
        </h2>
        <p className="text-xs text-fg-faint mb-3">
          All tracking data is stored locally on your device. Window titles are
          never sent to external services. Only aggregated metrics are used
          for AI analysis.
        </p>
        <button
          onClick={handleResetConsent}
          className="text-xs text-fg-faint hover:text-focus-low transition-colors"
        >
          Reset consent and show onboarding again
        </button>
      </div>
    </div>
  );
}
