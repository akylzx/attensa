import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';

export function SettingsPage() {
  const navigate = useNavigate();
  const [apiKey, setApiKey] = useState('');
  const [saved, setSaved] = useState(false);
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
    <div className="min-h-screen px-6 py-8 max-w-lg mx-auto">
      <button
        onClick={() => navigate('/')}
        className="text-sm text-muted hover:text-fg mb-6 transition-colors"
      >
        Back
      </button>

      <h1 className="text-2xl font-bold text-fg mb-8">Settings</h1>

      {/* Gemini API Key */}
      <div className="mb-8">
        <h2 className="text-sm font-medium text-subtle uppercase tracking-wider mb-3">
          AI Insights
        </h2>
        <label className="block text-sm text-fg mb-2">
          Gemini API Key
        </label>
        <p className="text-xs text-muted mb-3">
          Required for AI-powered session insights and monthly recaps.
          Your key is stored locally and never shared.
        </p>
        <div className="flex gap-2">
          <input
            type="password"
            value={apiKey}
            onChange={(e) => setApiKey(e.target.value)}
            placeholder="Enter your Gemini API key"
            className="flex-1 px-3 py-2 bg-surface border border-overlay rounded-lg text-sm text-fg placeholder-muted focus:outline-none focus:border-iris transition-colors"
          />
          <button
            onClick={handleSaveKey}
            className="px-4 py-2 bg-iris text-base rounded-lg text-sm font-medium transition-all hover:brightness-110"
          >
            {saved ? 'Saved' : 'Save'}
          </button>
        </div>
      </div>

      {/* Privacy */}
      <div className="mb-8">
        <h2 className="text-sm font-medium text-subtle uppercase tracking-wider mb-3">
          Privacy
        </h2>
        <p className="text-xs text-muted mb-3">
          All tracking data is stored locally on your device. Window titles are
          never sent to external services. Only aggregated metrics are used
          for AI analysis.
        </p>
        <button
          onClick={handleResetConsent}
          className="text-xs text-muted hover:text-love transition-colors"
        >
          Reset consent and show onboarding again
        </button>
      </div>
    </div>
  );
}
