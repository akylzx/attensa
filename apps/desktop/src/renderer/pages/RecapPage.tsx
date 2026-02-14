import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';

export function RecapPage() {
  const { yearMonth } = useParams<{ yearMonth: string }>();
  const navigate = useNavigate();
  const [recap, setRecap] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!yearMonth) return;
    setLoading(true);
    window.attensa.recap
      .getMonthly(yearMonth)
      .then(setRecap)
      .finally(() => setLoading(false));
  }, [yearMonth]);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen text-subtle">
        Loading recap...
      </div>
    );
  }

  if (!recap) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen px-8">
        <p className="text-subtle mb-4">No recap available for {yearMonth}</p>
        <button
          onClick={() => {
            if (yearMonth) {
              window.attensa.recap.generate(yearMonth).then(setRecap);
            }
          }}
          className="px-6 py-2 bg-iris text-base rounded-lg text-sm font-medium transition-all hover:brightness-110"
        >
          Generate Recap
        </button>
        <button
          onClick={() => navigate('/')}
          className="mt-4 text-sm text-muted hover:text-fg transition-colors"
        >
          Back
        </button>
      </div>
    );
  }

  return (
    <div className="min-h-screen px-6 py-8 max-w-lg mx-auto">
      <button
        onClick={() => navigate('/')}
        className="text-sm text-muted hover:text-fg mb-6 transition-colors"
      >
        Back
      </button>

      <h1 className="text-2xl font-bold text-fg mb-1">Monthly Recap</h1>
      <p className="text-subtle mb-8">{yearMonth}</p>

      <div className="grid grid-cols-2 gap-3 mb-8">
        <div className="bg-surface rounded-xl p-4">
          <p className="text-xs text-subtle uppercase tracking-wider mb-1">Sessions</p>
          <p className="text-2xl font-bold text-fg">{recap.sessionCount}</p>
        </div>
        <div className="bg-surface rounded-xl p-4">
          <p className="text-xs text-subtle uppercase tracking-wider mb-1">Focus Hours</p>
          <p className="text-2xl font-bold text-fg">
            {(recap.totalFocusTimeMs / 3600000).toFixed(1)}
          </p>
        </div>
        <div className="bg-surface rounded-xl p-4">
          <p className="text-xs text-subtle uppercase tracking-wider mb-1">Avg Fragmentation</p>
          <p className="text-2xl font-bold text-fg">
            {(recap.avgFragmentationScore * 100).toFixed(0)}
          </p>
        </div>
        <div className="bg-surface rounded-xl p-4">
          <p className="text-xs text-subtle uppercase tracking-wider mb-1">Avg Recovery</p>
          <p className="text-2xl font-bold text-fg">{(recap.avgRecoveryTimeMs / 1000).toFixed(0)}s</p>
        </div>
      </div>

      {recap.aiRecapJson && (() => {
        try {
          const insights = JSON.parse(recap.aiRecapJson);
          return (
            <div className="space-y-3">
              <h2 className="text-sm font-medium text-subtle uppercase tracking-wider">
                Insights
              </h2>
              {insights.recommendations?.map((rec: any, i: number) => (
                <div key={i} className="bg-surface rounded-xl p-4">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-xs text-iris uppercase tracking-wider font-medium">
                      {rec.category}
                    </span>
                    {rec.trend && (
                      <span className={`text-xs ${
                        rec.trend === 'improving' ? 'text-foam' :
                        rec.trend === 'declining' ? 'text-love' : 'text-muted'
                      }`}>
                        {rec.trend === 'improving' ? 'Improving' :
                         rec.trend === 'declining' ? 'Declining' : 'Stable'}
                      </span>
                    )}
                  </div>
                  <p className="text-sm text-fg leading-relaxed">{rec.text}</p>
                </div>
              ))}
            </div>
          );
        } catch {
          return null;
        }
      })()}
    </div>
  );
}
