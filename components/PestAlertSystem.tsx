import React, { useContext, useEffect, useState, useCallback } from 'react';
import {
  AlertTriangle,
  Bug,
  MapPin,
  ShieldCheck,
  ShoppingBag,
  ChevronDown,
  ChevronUp,
  ExternalLink,
  Send,
  RefreshCw,
  Loader,
  LocateFixed,
  Clock,
} from 'lucide-react';
import { AppContext } from '../App';
import { pestAlertService } from '../services/pestAlertService';
import { PestReport } from '../types';

const SEVERITY_STYLES: Record<string, string> = {
  Low: 'bg-emerald-50 border-emerald-200 text-emerald-700',
  Medium: 'bg-amber-50 border-amber-200 text-amber-700',
  High: 'bg-orange-50 border-orange-200 text-orange-700',
  Critical: 'bg-red-50 border-red-200 text-red-700',
};

const SEVERITY_BADGE: Record<string, string> = {
  Low: 'bg-emerald-100 text-emerald-700',
  Medium: 'bg-amber-100 text-amber-700',
  High: 'bg-orange-100 text-orange-700',
  Critical: 'bg-red-100 text-red-700',
};

const PestAlertSystem: React.FC = () => {
  const context = useContext(AppContext);
  if (!context) return null;
  const { user } = context;

  const [tab, setTab] = useState<'alerts' | 'report'>('alerts');
  const [nearbyAlerts, setNearbyAlerts] = useState<PestReport[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [success, setSuccess] = useState('');

  // Form state
  const [pestName, setPestName] = useState('');
  const [severity, setSeverity] = useState<PestReport['severity']>('Medium');
  const [cropAffected, setCropAffected] = useState(user?.primaryCrop || '');
  const [customPest, setCustomPest] = useState('');
  const [isLocating, setIsLocating] = useState(false);
  const [reportLat, setReportLat] = useState(user?.location?.lat || 0);
  const [reportLon, setReportLon] = useState(user?.location?.lng || 0);
  const [locationName, setLocationName] = useState(user?.location?.name || '');

  const loadAlerts = useCallback(async () => {
    if (!user?.location) return;
    setLoading(true);
    try {
      const alerts = await pestAlertService.getNearbyAlerts(
        user.location.lat,
        user.location.lng
      );
      setNearbyAlerts(alerts);
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    loadAlerts();
    const interval = window.setInterval(loadAlerts, 60_000);
    return () => window.clearInterval(interval);
  }, [loadAlerts]);

  const detectLocation = () => {
    setIsLocating(true);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setReportLat(pos.coords.latitude);
        setReportLon(pos.coords.longitude);
        setLocationName(`(${pos.coords.latitude.toFixed(2)}, ${pos.coords.longitude.toFixed(2)})`);
        setIsLocating(false);
      },
      () => setIsLocating(false),
      { timeout: 6000 }
    );
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    const finalPest = pestName === '__custom__' ? customPest.trim() : pestName;
    if (!finalPest) return;

    setSubmitting(true);
    setSuccess('');
    try {
      await pestAlertService.reportPest({
        uid: user.uid,
        pest_name: finalPest,
        severity,
        lat: reportLat,
        lon: reportLon,
        location_name: locationName || user.location.name,
        crop_affected: cropAffected || user.primaryCrop,
      });
      setSuccess(`✓ ${finalPest} alert reported. Nearby farmers have been notified.`);
      setPestName('');
      setCustomPest('');
      setSeverity('Medium');
      await loadAlerts();
      setTimeout(() => setTab('alerts'), 1500);
    } catch {
      setSuccess('Failed to submit report. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  const timeAgo = (ts: number) => {
    const diff = Date.now() - ts;
    if (diff < 3600000) return `${Math.round(diff / 60000)}m ago`;
    if (diff < 86400000) return `${Math.round(diff / 3600000)}h ago`;
    return `${Math.round(diff / 86400000)}d ago`;
  };

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="app-card overflow-hidden">
        <div className="bg-gradient-to-r from-orange-600 to-red-600 p-5">
          <p className="text-xs font-bold uppercase tracking-[0.2em] text-orange-200">Cluster Intelligence</p>
          <h1 className="mt-1 text-2xl font-extrabold text-white">Pest Alert System</h1>
          <p className="mt-1 text-sm text-orange-200">
            {nearbyAlerts.length} alert{nearbyAlerts.length !== 1 ? 's' : ''} within {pestAlertService.ALERT_RADIUS_KM}km
          </p>
        </div>

        {/* Tabs */}
        <div className="flex border-b border-[var(--line)]">
          {(['alerts', 'report'] as const).map((t) => (
            <button
              key={t}
              onClick={() => setTab(t)}
              className={`flex-1 py-3 text-sm font-bold capitalize transition ${
                tab === t
                  ? 'border-b-2 border-orange-600 text-orange-700'
                  : 'text-[var(--text-700)] hover:text-[var(--text-900)]'
              }`}
            >
              {t === 'alerts' ? `Nearby Alerts (${nearbyAlerts.length})` : 'Report Pest'}
            </button>
          ))}
        </div>
      </div>

      {/* Nearby Alerts Tab */}
      {tab === 'alerts' && (
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <p className="text-xs font-bold uppercase tracking-wide text-[var(--text-700)]">
              Within {pestAlertService.ALERT_RADIUS_KM}km radius
            </p>
            <button
              onClick={loadAlerts}
              className="flex items-center gap-1 rounded-lg border border-[var(--line)] bg-white px-3 py-1.5 text-xs font-bold text-[var(--text-700)] transition hover:border-orange-400"
            >
              <RefreshCw size={12} /> Refresh
            </button>
          </div>

          {loading ? (
            <div className="app-card flex items-center justify-center p-8">
              <Loader size={24} className="animate-spin text-orange-500" />
            </div>
          ) : nearbyAlerts.length === 0 ? (
            <div className="app-card p-8 text-center">
              <ShieldCheck size={36} className="mx-auto mb-3 text-emerald-500" />
              <p className="font-bold text-[var(--text-900)]">No Pest Alerts Nearby</p>
              <p className="mt-1 text-sm text-[var(--text-700)]">Your area is clear within {pestAlertService.ALERT_RADIUS_KM}km.</p>
            </div>
          ) : (
            nearbyAlerts.map((alert) => (
              <div key={alert.id} className={`rounded-2xl border p-4 ${SEVERITY_STYLES[alert.severity]}`}>
                <div className="flex items-start justify-between gap-2">
                  <div className="flex items-start gap-3">
                    <div className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-current/10">
                      <Bug size={18} />
                    </div>
                    <div>
                      <div className="flex items-center gap-2 flex-wrap">
                        <p className="font-bold">{alert.pest_name}</p>
                        <span className={`rounded-full px-2 py-0.5 text-xs font-bold ${SEVERITY_BADGE[alert.severity]}`}>
                          {alert.severity}
                        </span>
                      </div>
                      <p className="text-xs mt-0.5">Crop: {alert.crop_affected}</p>
                      <div className="mt-1 flex items-center gap-2 text-xs opacity-80">
                        <MapPin size={11} /> {alert.location_name}
                        <Clock size={11} /> {timeAgo(alert.reported_at)}
                      </div>
                    </div>
                  </div>
                  <button
                    onClick={() => setExpandedId(expandedId === alert.id ? null : alert.id)}
                    className="shrink-0 rounded-lg p-1"
                  >
                    {expandedId === alert.id ? <ChevronUp size={18} /> : <ChevronDown size={18} />}
                  </button>
                </div>

                {expandedId === alert.id && (
                  <div className="mt-3 space-y-3 border-t border-current/20 pt-3">
                    <div>
                      <p className="mb-1 text-xs font-bold uppercase tracking-wide opacity-70">Preventive Measures</p>
                      <ul className="space-y-1">
                        {alert.preventive_measures.map((m, i) => (
                          <li key={i} className="flex items-start gap-2 text-xs">
                            <span className="mt-1 h-1.5 w-1.5 shrink-0 rounded-full bg-current" />
                            {m}
                          </li>
                        ))}
                      </ul>
                    </div>

                    <div>
                      <p className="mb-1 text-xs font-bold uppercase tracking-wide opacity-70">Suggested Pesticides</p>
                      <div className="flex flex-wrap gap-1">
                        {alert.suggested_pesticides.map((p, i) => (
                          <span key={i} className="rounded-full border border-current/30 bg-current/10 px-2 py-0.5 text-xs font-semibold">
                            {p}
                          </span>
                        ))}
                      </div>
                    </div>

                    {alert.product_recommendations && (
                      <div>
                        <p className="mb-2 flex items-center gap-1 text-xs font-bold uppercase tracking-wide opacity-70">
                          <ShoppingBag size={12} /> Products
                        </p>
                        <div className="space-y-2">
                          {alert.product_recommendations.map((prod) => (
                            <div key={prod.id} className="rounded-xl border border-current/20 bg-white/40 p-3">
                              <div className="flex items-start justify-between gap-2">
                                <div>
                                  <p className="font-bold text-sm">{prod.name}</p>
                                  <p className="text-xs opacity-80">{prod.brand} · {prod.dosage}</p>
                                  <p className="mt-1 text-xs font-semibold">{prod.price_range}</p>
                                </div>
                                {prod.available_online && (
                                  <a
                                    href={prod.buy_url}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="flex shrink-0 items-center gap-1 rounded-lg bg-current/20 px-2 py-1 text-xs font-bold"
                                  >
                                    Buy <ExternalLink size={10} />
                                  </a>
                                )}
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>
            ))
          )}
        </div>
      )}

      {/* Report Pest Tab */}
      {tab === 'report' && (
        <div className="app-card p-5">
          <div className="mb-4 flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-orange-100">
              <Bug size={18} className="text-orange-600" />
            </div>
            <div>
              <p className="font-bold text-[var(--text-900)]">Report a Pest</p>
              <p className="text-xs text-[var(--text-700)]">Alert nearby farmers immediately</p>
            </div>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="mb-1.5 block text-sm font-bold text-[var(--text-700)]">Pest Name</label>
              <select
                value={pestName}
                onChange={(e) => setPestName(e.target.value)}
                className="w-full rounded-xl border border-[var(--line)] bg-white px-4 py-3 text-sm font-semibold text-[var(--text-900)] outline-none focus:border-orange-400"
                required
              >
                <option value="">Select pest…</option>
                {pestAlertService.KNOWN_PESTS.map((p) => (
                  <option key={p} value={p}>{p}</option>
                ))}
                <option value="__custom__">Other (type below)</option>
              </select>
            </div>

            {pestName === '__custom__' && (
              <input
                type="text"
                value={customPest}
                onChange={(e) => setCustomPest(e.target.value)}
                placeholder="Enter pest name…"
                className="w-full rounded-xl border border-[var(--line)] bg-white px-4 py-3 text-sm font-semibold text-[var(--text-900)] outline-none focus:border-orange-400"
                required
              />
            )}

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="mb-1.5 block text-sm font-bold text-[var(--text-700)]">Severity</label>
                <select
                  value={severity}
                  onChange={(e) => setSeverity(e.target.value as PestReport['severity'])}
                  className="w-full rounded-xl border border-[var(--line)] bg-white px-4 py-3 text-sm font-semibold text-[var(--text-900)] outline-none focus:border-orange-400"
                >
                  {(['Low', 'Medium', 'High', 'Critical'] as const).map((s) => (
                    <option key={s} value={s}>{s}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="mb-1.5 block text-sm font-bold text-[var(--text-700)]">Crop Affected</label>
                <input
                  type="text"
                  value={cropAffected}
                  onChange={(e) => setCropAffected(e.target.value)}
                  placeholder={user?.primaryCrop || 'Crop name'}
                  className="w-full rounded-xl border border-[var(--line)] bg-white px-4 py-3 text-sm font-semibold text-[var(--text-900)] outline-none focus:border-orange-400"
                />
              </div>
            </div>

            <div>
              <label className="mb-1.5 block text-sm font-bold text-[var(--text-700)]">Location</label>
              <div className="flex gap-2">
                <input
                  type="text"
                  value={locationName}
                  onChange={(e) => setLocationName(e.target.value)}
                  placeholder="Your location"
                  className="flex-1 rounded-xl border border-[var(--line)] bg-white px-4 py-3 text-sm font-semibold text-[var(--text-900)] outline-none focus:border-orange-400"
                />
                <button
                  type="button"
                  onClick={detectLocation}
                  className="flex items-center gap-2 rounded-xl border border-[var(--line)] bg-[var(--surface)] px-3 py-3 text-xs font-bold text-[var(--text-700)] transition hover:border-orange-400"
                >
                  <LocateFixed size={16} className={isLocating ? 'animate-pulse text-orange-500' : ''} />
                  GPS
                </button>
              </div>
            </div>

            {success && (
              <div className={`rounded-xl px-4 py-3 text-sm font-semibold ${success.startsWith('✓') ? 'bg-emerald-50 text-emerald-700' : 'bg-red-50 text-red-600'}`}>
                {success}
              </div>
            )}

            <button
              type="submit"
              disabled={submitting || !pestName}
              className="flex w-full items-center justify-center gap-2 rounded-xl bg-orange-600 py-3 text-sm font-extrabold text-white transition hover:bg-orange-700 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {submitting ? <Loader size={16} className="animate-spin" /> : <Send size={16} />}
              {submitting ? 'Submitting…' : 'Submit Pest Report'}
            </button>
          </form>
        </div>
      )}
    </div>
  );
};

export default PestAlertSystem;
