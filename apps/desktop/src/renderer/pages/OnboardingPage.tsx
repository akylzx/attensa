import { useState, useEffect } from 'react';

interface Props {
  onConsent: () => void;
}

export function OnboardingPage({ onConsent }: Props) {
  const [phase, setPhase] = useState<'logo' | 'consent' | 'transition'>('logo');
  const [logoVisible, setLogoVisible] = useState(false);
  const [consentVisible, setConsentVisible] = useState(false);
  const [accepted, setAccepted] = useState(false);

  useEffect(() => {
    const t1 = setTimeout(() => setLogoVisible(true), 100);
    const t2 = setTimeout(() => {
      setPhase('consent');
      setTimeout(() => setConsentVisible(true), 50);
    }, 1600);
    return () => {
      clearTimeout(t1);
      clearTimeout(t2);
    };
  }, []);

  const handleAgree = async () => {
    setPhase('transition');
    await window.attensa.settings.set('consentAccepted', true);
    setTimeout(onConsent, 900);
  };

  return (
    <div
      className={`min-h-screen flex flex-col items-center justify-center px-8 transition-opacity duration-700 ${
        phase === 'transition' ? 'opacity-0' : 'opacity-100'
      }`}
    >
      {/* Logo */}
      <div
        className={`flex flex-col items-center transition-all duration-1000 ease-out ${
          logoVisible ? 'opacity-100 translate-y-0 scale-100' : 'opacity-0 translate-y-6 scale-95'
        } ${phase === 'consent' ? 'mb-8' : 'mb-0'}`}
        style={{
          transitionProperty: 'opacity, transform, margin',
        }}
      >
        {/* Logo mark */}
        <div className="relative mb-5">
          <div
            className={`w-20 h-20 rounded-2xl bg-gradient-to-br from-iris to-pine flex items-center justify-center shadow-lg shadow-iris/20 transition-all duration-1000 ${
              logoVisible ? 'rotate-0' : '-rotate-12'
            }`}
          >
            <svg
              width="44"
              height="44"
              viewBox="0 0 44 44"
              fill="none"
              className={`transition-all duration-1000 delay-300 ${
                logoVisible ? 'opacity-100 scale-100' : 'opacity-0 scale-75'
              }`}
            >
              <circle cx="22" cy="22" r="16" stroke="white" strokeWidth="2" opacity="0.3" />
              <circle cx="22" cy="22" r="10" stroke="white" strokeWidth="2" opacity="0.5" />
              <circle cx="22" cy="22" r="4" fill="white" />
            </svg>
          </div>
        </div>

        <h1
          className={`text-3xl font-bold tracking-tight text-fg transition-all duration-700 delay-500 ${
            logoVisible ? 'opacity-100' : 'opacity-0'
          }`}
        >
          Attensa
        </h1>
        <p
          className={`text-subtle text-sm mt-1 transition-all duration-700 delay-700 ${
            logoVisible ? 'opacity-100' : 'opacity-0'
          }`}
        >
          Focus Analytics
        </p>
      </div>

      {/* Consent form */}
      {phase !== 'logo' && (
        <div
          className={`w-full max-w-sm transition-all duration-700 ease-out ${
            consentVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'
          }`}
        >
          <div className="bg-surface rounded-2xl p-6 mb-6 border border-overlay">
            <h2 className="text-sm font-semibold uppercase tracking-wider text-fg mb-4">
              Before we begin
            </h2>

            <div className="space-y-3 text-sm text-subtle leading-relaxed">
              <p>
                Attensa tracks your active applications and window titles during
                Focus Time sessions to measure your focus patterns.
              </p>
              <p>
                All tracking data is stored <span className="text-fg font-medium">locally on your device</span>.
                Raw window titles never leave your computer unless you explicitly opt in.
              </p>
              <p>
                You can delete all data at any time from Settings.
              </p>
            </div>

            <div className="mt-5 border-t border-overlay pt-4">
              <label className="flex items-start gap-3 cursor-pointer group">
                <input
                  type="checkbox"
                  checked={accepted}
                  onChange={(e) => setAccepted(e.target.checked)}
                  className="mt-0.5 w-4 h-4 rounded border-hl-med bg-overlay accent-iris cursor-pointer"
                />
                <span className="text-sm text-subtle group-hover:text-fg transition-colors">
                  I understand that Attensa will track my active applications
                  during Focus Time sessions and store this data locally.
                </span>
              </label>
            </div>
          </div>

          <button
            onClick={handleAgree}
            disabled={!accepted}
            className="w-full py-4 rounded-xl font-semibold text-lg transition-all bg-iris text-base hover:brightness-110 disabled:opacity-30 disabled:cursor-not-allowed"
          >
            Get Started
          </button>
        </div>
      )}
    </div>
  );
}
