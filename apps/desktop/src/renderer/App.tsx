import { useState, useEffect } from 'react';
import { HashRouter, Routes, Route } from 'react-router-dom';
import { OnboardingPage } from './pages/OnboardingPage';
import { HomePage } from './pages/HomePage';
import { ActiveSessionPage } from './pages/ActiveSessionPage';
import { SummaryPage } from './pages/SummaryPage';
import { RecapPage } from './pages/RecapPage';
import { SettingsPage } from './pages/SettingsPage';
import { HistoryPage } from './pages/HistoryPage';

export function App() {
  const [consented, setConsented] = useState<boolean | null>(null);

  useEffect(() => {
    window.attensa.settings.get().then((settings: any) => {
      setConsented(settings?.consentAccepted === true);
    });
  }, []);

  // Still loading settings
  if (consented === null) {
    return <div className="min-h-screen" />;
  }

  if (!consented) {
    return <OnboardingPage onConsent={() => setConsented(true)} />;
  }

  return (
    <HashRouter>
      <Routes>
        <Route path="/" element={<HomePage />} />
        <Route path="/session/active" element={<ActiveSessionPage />} />
        <Route path="/session/:id/summary" element={<SummaryPage />} />
        <Route path="/recap/:yearMonth" element={<RecapPage />} />
        <Route path="/history" element={<HistoryPage />} />
        <Route path="/settings" element={<SettingsPage />} />
      </Routes>
    </HashRouter>
  );
}
