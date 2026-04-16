import React, { useEffect, useMemo, useState } from 'react';
import { ExternalLink, RefreshCw, ShieldAlert, Wind } from 'lucide-react';
import { aqiService, AqiRecord } from '../services/aqiService';
import { integrationConfig } from '../services/integrationConfig';

const AQIMonitor: React.FC = () => {
  const [records, setRecords] = useState<AqiRecord[]>([]);
  const [source, setSource] = useState('loading');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [showEmbed, setShowEmbed] = useState(false);

  const latest = records.at(-1);
  const level = useMemo(() => {
    if (!latest) return null;
    return aqiService.getAqiLevel(latest.aqi);
  }, [latest]);

  const refresh = async () => {
    setLoading(true);
    setError('');
    try {
      const result = await aqiService.getLatestRecords();
      setRecords(result.records);
      setSource(result.source);
    } catch (err) {
      setError(String(err));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    refresh();
    const timer = window.setInterval(refresh, 15_000);
    return () => window.clearInterval(timer);
  }, []);

  const sparklineBars = records.slice(-12);
  const maxAqi = Math.max(...sparklineBars.map((item) => item.aqi), 1);

  return (
    <section className="space-y-4 animate-fade-in">
      <div className="app-card app-gradient p-5">
        <div className="flex items-center justify-between gap-3">
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.2em] text-white/80">Integrated module</p>
            <h2 className="mt-1 text-2xl font-extrabold text-white">UrbanLive AQI Monitor</h2>
            <p className="text-sm text-white/85">
              Real-time ingestion summary connected from your UrbanLive project.
            </p>
          </div>
          <Wind size={34} className="text-white/90" />
        </div>
      </div>

      <div className="app-card p-5">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div>
            <p className="text-sm font-bold text-[var(--text-900)]">Live AQI signal</p>
            <p className="text-xs text-[var(--text-700)]">Data source: {source}</p>
          </div>
          <button
            type="button"
            onClick={refresh}
            className="inline-flex items-center gap-2 rounded-xl border border-[var(--line)] bg-white px-3 py-2 text-xs font-bold text-[var(--text-700)] transition hover:border-[var(--brand-500)] hover:text-[var(--brand-700)]"
          >
            <RefreshCw size={14} />
            Refresh
          </button>
        </div>

        {loading ? (
          <p className="mt-4 text-sm font-semibold text-[var(--text-700)]">Loading AQI feed...</p>
        ) : (
          <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-3">
            <div className="rounded-xl border border-[var(--line)] bg-[var(--surface)] p-4">
              <p className="text-xs font-bold uppercase tracking-wide text-[var(--text-700)]">Current AQI</p>
              <p
                className="mt-1 text-3xl font-extrabold"
                style={{ color: level?.color || 'var(--text-900)' }}
              >
                {latest?.aqi ?? '--'}
              </p>
              <p className="text-sm font-semibold text-[var(--text-700)]">{level?.label || 'Unknown'}</p>
            </div>

            <div className="rounded-xl border border-[var(--line)] bg-[var(--surface)] p-4">
              <p className="text-xs font-bold uppercase tracking-wide text-[var(--text-700)]">Trend delta</p>
              <p className="mt-1 text-3xl font-extrabold text-[var(--text-900)]">
                {latest ? (latest.diff > 0 ? `+${latest.diff}` : latest.diff) : '--'}
              </p>
              <p className="text-sm font-semibold text-[var(--text-700)]">5 sec window</p>
            </div>

            <div className="rounded-xl border border-[var(--line)] bg-[var(--surface)] p-4">
              <p className="text-xs font-bold uppercase tracking-wide text-[var(--text-700)]">Last update</p>
              <p className="mt-1 text-base font-extrabold text-[var(--text-900)]">
                {latest ? new Date(latest.time || latest.timestamp).toLocaleTimeString() : '--'}
              </p>
              <p className="text-sm font-semibold text-[var(--text-700)]">Local time</p>
            </div>
          </div>
        )}

        {sparklineBars.length > 0 && (
          <div className="mt-4 rounded-xl border border-[var(--line)] bg-white p-3">
            <p className="mb-2 text-xs font-bold uppercase tracking-wide text-[var(--text-700)]">
              Recent AQI pattern
            </p>
            <div className="flex items-end gap-1">
              {sparklineBars.map((item) => {
                const height = Math.max(8, Math.round((item.aqi / maxAqi) * 64));
                const tone = aqiService.getAqiLevel(item.aqi).color;
                return (
                  <div key={`${item.time}_${item.aqi}`} className="flex-1">
                    <div
                      className="w-full rounded-t"
                      style={{
                        height: `${height}px`,
                        background: tone,
                        opacity: 0.75,
                      }}
                      title={`AQI ${item.aqi}`}
                    />
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {error && (
          <div className="mt-4 rounded-xl border border-red-200 bg-red-50 p-3 text-sm font-semibold text-red-700">
            {error}
          </div>
        )}
      </div>

      <div className="app-card p-5">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <p className="text-sm font-bold text-[var(--text-900)]">Full urban dashboard</p>
            <p className="text-xs text-[var(--text-700)]">{integrationConfig.aqiDashboardUrl}</p>
          </div>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => setShowEmbed((prev) => !prev)}
              className="rounded-xl border border-[var(--line)] bg-white px-3 py-2 text-xs font-bold text-[var(--text-700)]"
            >
              {showEmbed ? 'Hide embed' : 'Embed dashboard'}
            </button>
            <button
              type="button"
              onClick={() => window.open(integrationConfig.aqiDashboardUrl, '_blank')}
              className="inline-flex items-center gap-2 rounded-xl bg-[var(--brand-700)] px-3 py-2 text-xs font-bold text-white"
            >
              <ExternalLink size={14} />
              Open full view
            </button>
          </div>
        </div>

        {showEmbed && (
          <div className="mt-4 overflow-hidden rounded-xl border border-[var(--line)]">
            <iframe
              title="UrbanLive AQI Dashboard"
              src={integrationConfig.aqiDashboardUrl}
              className="h-[620px] w-full border-0"
            />
          </div>
        )}
      </div>

      {latest && latest.aqi > 200 && (
        <div className="app-card border-red-200 bg-red-50 p-4 text-red-700">
          <p className="flex items-center gap-2 text-sm font-bold">
            <ShieldAlert size={16} />
            Air quality alert
          </p>
          <p className="mt-1 text-sm">
            AQI is in high-risk range. Advise farmers to reduce outdoor spray windows and use masks.
          </p>
        </div>
      )}
    </section>
  );
};

export default AQIMonitor;

