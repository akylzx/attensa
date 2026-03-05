import { useState, useEffect } from 'react';
import { HashRouter, Routes, Route } from 'react-router-dom';
import { OnboardingPage } from './pages/OnboardingPage';
import { HomePage } from './pages/HomePage';
import { ActiveSessionPage } from './pages/ActiveSessionPage';
import { SummaryPage } from './pages/SummaryPage';
import { RecapPage } from './pages/RecapPage';
import { SettingsPage } from './pages/SettingsPage';
import { HistoryPage } from './pages/HistoryPage';
import { NavLayout } from './components/NavLayout';
import { ThemeProvider } from './components/ThemeContext';

export function App() {
  const [consented, setConsented] = useState<boolean | null>(null);

  useEffect(() => {
    window.attensa.settings.get().then((settings: any) => {
      setConsented(settings?.consentAccepted === true);
    });
  }, []);

  // Still loading settings — show logo splash
  if (consented === null) {
    return (
      <ThemeProvider>
        <div className="min-h-screen flex flex-col items-center justify-center">
          <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-accent to-accent-dim flex items-center justify-center shadow-lg shadow-accent/20 opacity-60">
            <svg width="36" height="36" viewBox="0 0 44 44" fill="none">
              <circle cx="22" cy="22" r="16" stroke="white" strokeWidth="2" opacity="0.3" />
              <circle cx="22" cy="22" r="10" stroke="white" strokeWidth="2" opacity="0.5" />
              <circle cx="22" cy="22" r="4" fill="white" />
            </svg>
          </div>
        </div>
      </ThemeProvider>
    );
  }

  if (!consented) {
    return (
      <ThemeProvider>
        <OnboardingPage onConsent={() => setConsented(true)} />
      </ThemeProvider>
    );
  }

  return (
    <ThemeProvider>
      <HashRouter>
        <Routes>
          {/* Full-screen immersive — no sidebar */}
          <Route path="/session/active" element={<ActiveSessionPage />} />

          {/* Sidebar layout */}
          <Route element={<NavLayout />}>
            <Route path="/" element={<HomePage />} />
            <Route path="/history" element={<HistoryPage />} />
            <Route path="/settings" element={<SettingsPage />} />
            <Route path="/session/:id/summary" element={<SummaryPage />} />
            <Route path="/recap/:yearMonth" element={<RecapPage />} />
          </Route>
        </Routes>
      </HashRouter>
    </ThemeProvider>
  );
}
