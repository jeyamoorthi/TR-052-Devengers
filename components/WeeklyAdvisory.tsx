import React, { useContext, useEffect, useState, useCallback } from 'react';
import {
  Calendar,
  Droplets,
  RefreshCw,
  AlertTriangle,
  Wheat,
  ChevronDown,
  ChevronUp,
  Clock,
  CheckCircle,
  Loader,
  ShieldAlert,
  TrendingUp,
  Sprout,
} from 'lucide-react';
import { AppContext } from '../App';
import { weeklyAdvisoryService } from '../services/weeklyAdvisoryService';
import { AdvisoryLog, IrrigationSlot, PestRiskAlert } from '../types';

const RISK_COLORS: Record<string, string> = {
  Low: 'text-emerald-600 bg-emerald-50 border-emerald-200',
  Medium: 'text-amber-600 bg-amber-50 border-amber-200',
  High: 'text-red-600 bg-red-50 border-red-200',
};

const QUALITY_COLORS: Record<string, string> = {
  Low: 'text-red-600',
  Medium: 'text-amber-600',
  High: 'text-emerald-600',
};

const WeeklyAdvisory: React.FC = () => {
  const context = useContext(AppContext);
  if (!context) return null;
  const { user } = context;

  const [advisory, setAdvisory] = useState<AdvisoryLog | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [expandedPest, setExpandedPest] = useState<string | null>(null);
  const [expandHarvest, setExpandHarvest] = useState(false);
  const [error, setError] = useState('');

  const load = useCallback(async (force = false) => {
    if (!user) return;
    try {
      force ? setRefreshing(true) : setLoading(true);
      setError('');
      const log = await weeklyAdvisoryService.getWeeklyAdvisory(user, force);
      setAdvisory(log);
    } catch {
      setError('Failed to load advisory. Please try again.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [user]);

  useEffect(() => { load(); }, [load]);

  const formatDate = (iso: string) =>
    new Date(iso).toLocaleDateString('en-IN', { day: '2-digit', month: 'short' });

  const daysUntilHarvest = advisory
    ? Math.max(0, Math.round((new Date(advisory.harvest_plan.estimated_harvest_date).getTime() - Date.now()) / 86400000))
    : 0;

  if (loading) {
    return (
      <div className="space-y-4">
        <div className="app-card p-6">
          <div className="flex flex-col items-center gap-4 py-6 text-center">
            <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-violet-100">
              <Loader size={28} className="animate-spin text-violet-600" />
            </div>
            <div>
              <p className="font-bold text-[var(--text-900)]">Generating Weekly Advisory</p>
              <p className="mt-1 text-sm text-[var(--text-700)]">AI is analysing your soil, weather & market data…</p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (error || !advisory) {
    return (
      <div className="app-card p-6 text-center">
        <AlertTriangle size={32} className="mx-auto mb-3 text-amber-500" />
        <p className="font-bold text-[var(--text-900)]">{error || 'No advisory available'}</p>
        <button onClick={() => load(true)} className="mt-4 rounded-xl bg-[var(--brand-700)] px-5 py-2 text-sm font-bold text-white">
          Retry
        </button>
      </div>
    );
  }

  const { irrigation_schedule, pest_risk_alerts, harvest_plan } = advisory;

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="app-card overflow-hidden">
        <div className="bg-gradient-to-r from-violet-700 to-indigo-600 p-5">
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="text-xs font-bold uppercase tracking-[0.2em] text-violet-200">AI Advisory Engine</p>
              <h1 className="mt-1 text-2xl font-extrabold text-white">Weekly Farm Plan</h1>
              <p className="mt-1 text-sm text-violet-200">Week of {formatDate(advisory.week_start)}</p>
            </div>
            <button
              onClick={() => load(true)}
              disabled={refreshing}
              className="flex items-center gap-2 rounded-xl bg-white/15 px-3 py-2 text-xs font-bold text-white transition hover:bg-white/25 disabled:opacity-60"
            >
              <RefreshCw size={14} className={refreshing ? 'animate-spin' : ''} />
              {refreshing ? 'Updating…' : 'Refresh'}
            </button>
          </div>
        </div>

        {/* Quick stats */}
        <div className="grid grid-cols-3 divide-x divide-[var(--line)]">
          <div className="p-3 text-center">
            <p className="text-2xl font-extrabold text-violet-700">{irrigation_schedule.length}</p>
            <p className="text-xs font-semibold text-[var(--text-700)]">Irrigations</p>
          </div>
          <div className="p-3 text-center">
            <p className="text-2xl font-extrabold text-amber-600">{pest_risk_alerts.length}</p>
            <p className="text-xs font-semibold text-[var(--text-700)]">Pest Risks</p>
          </div>
          <div className="p-3 text-center">
            <p className="text-2xl font-extrabold text-emerald-600">{daysUntilHarvest}d</p>
            <p className="text-xs font-semibold text-[var(--text-700)]">To Harvest</p>
          </div>
        </div>
      </div>

      {/* Irrigation Schedule */}
      <div className="app-card p-5">
        <div className="mb-4 flex items-center gap-3">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-sky-100">
            <Droplets size={18} className="text-sky-600" />
          </div>
          <div>
            <p className="font-bold text-[var(--text-900)]">Irrigation Schedule</p>
            <p className="text-xs text-[var(--text-700)]">Reminders set 30 min before each slot</p>
          </div>
        </div>

        <div className="space-y-2">
          {irrigation_schedule.map((slot: IrrigationSlot, i: number) => {
            const slotTime = new Date(`${slot.date}T${slot.time}:00`);
            const isPast = slotTime < new Date();
            return (
              <div
                key={i}
                className={`flex items-center gap-3 rounded-xl border p-3 transition ${
                  isPast
                    ? 'border-[var(--line)] bg-[var(--surface)] opacity-60'
                    : 'border-sky-200 bg-sky-50'
                }`}
              >
                <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-full ${isPast ? 'bg-gray-200' : 'bg-sky-200'}`}>
                  {isPast ? <CheckCircle size={18} className="text-gray-500" /> : <Clock size={18} className="text-sky-700" />}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-bold text-[var(--text-900)]">{slot.day}</p>
                  <p className="text-xs text-[var(--text-700)]">
                    {formatDate(slot.date)} · {slot.time} · {slot.duration_minutes} min · {slot.method}
                  </p>
                </div>
                {slot.reminder_sent && (
                  <span className="rounded-full bg-emerald-100 px-2 py-0.5 text-xs font-bold text-emerald-700">Notified</span>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* Pest Risk Alerts */}
      <div className="app-card p-5">
        <div className="mb-4 flex items-center gap-3">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-red-100">
            <ShieldAlert size={18} className="text-red-600" />
          </div>
          <p className="font-bold text-[var(--text-900)]">Pest Risk Alerts</p>
        </div>

        <div className="space-y-2">
          {pest_risk_alerts.map((alert: PestRiskAlert, i: number) => (
            <div key={i} className={`rounded-xl border p-3 ${RISK_COLORS[alert.risk_level] || 'border-gray-200 bg-gray-50'}`}>
              <div
                className="flex cursor-pointer items-center justify-between gap-2"
                onClick={() => setExpandedPest(expandedPest === String(i) ? null : String(i))}
              >
                <div className="flex items-center gap-2">
                  <AlertTriangle size={16} />
                  <p className="font-bold">{alert.pest}</p>
                  <span className="rounded-full border px-2 py-0.5 text-xs font-bold">{alert.risk_level} Risk</span>
                </div>
                {expandedPest === String(i) ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
              </div>
              {expandedPest === String(i) && (
                <div className="mt-3 border-t border-current/20 pt-3">
                  <p className="text-xs font-semibold mb-1">Crop: {alert.affected_crop}</p>
                  <p className="text-sm">{alert.action}</p>
                </div>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Harvest Plan */}
      <div className="app-card overflow-hidden">
        <button
          onClick={() => setExpandHarvest(!expandHarvest)}
          className="flex w-full items-center justify-between gap-3 p-5"
        >
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-emerald-100">
              <Wheat size={18} className="text-emerald-700" />
            </div>
            <div className="text-left">
              <p className="font-bold text-[var(--text-900)]">Harvest Planning</p>
              <p className="text-xs text-[var(--text-700)]">Est. {formatDate(harvest_plan.estimated_harvest_date)}</p>
            </div>
          </div>
          {expandHarvest ? <ChevronUp size={18} /> : <ChevronDown size={18} />}
        </button>

        {expandHarvest && (
          <div className="border-t border-[var(--line)] p-5 space-y-4">
            <div className="grid grid-cols-3 gap-3">
              <div className="rounded-xl bg-[var(--surface)] p-3 text-center">
                <p className="text-lg font-extrabold text-[var(--brand-700)]">{harvest_plan.expected_yield_qtl} qtl</p>
                <p className="text-xs text-[var(--text-700)]">Expected Yield</p>
              </div>
              <div className="rounded-xl bg-[var(--surface)] p-3 text-center">
                <p className={`text-lg font-extrabold ${QUALITY_COLORS[harvest_plan.quality_forecast]}`}>
                  {harvest_plan.quality_forecast}
                </p>
                <p className="text-xs text-[var(--text-700)]">Quality</p>
              </div>
              <div className="rounded-xl bg-[var(--surface)] p-3 text-center">
                <p className="text-lg font-extrabold text-violet-600">{daysUntilHarvest}d</p>
                <p className="text-xs text-[var(--text-700)]">Remaining</p>
              </div>
            </div>

            <div className="rounded-xl bg-amber-50 border border-amber-200 p-3">
              <div className="flex items-center gap-2 mb-2">
                <TrendingUp size={14} className="text-amber-600" />
                <p className="text-xs font-bold text-amber-700 uppercase tracking-wide">Market Timing</p>
              </div>
              <p className="text-sm text-amber-800">{harvest_plan.market_timing_advice}</p>
            </div>

            <div>
              <div className="flex items-center gap-2 mb-2">
                <Sprout size={14} className="text-emerald-600" />
                <p className="text-xs font-bold text-[var(--text-700)] uppercase tracking-wide">Post-Harvest Tips</p>
              </div>
              <ul className="space-y-1">
                {harvest_plan.post_harvest_tips.map((tip, i) => (
                  <li key={i} className="flex items-start gap-2 text-sm text-[var(--text-700)]">
                    <span className="mt-0.5 h-1.5 w-1.5 shrink-0 rounded-full bg-emerald-500" />
                    {tip}
                  </li>
                ))}
              </ul>
            </div>
          </div>
        )}
      </div>

      <p className="text-center text-xs text-[var(--text-700)]">
        Last updated: {new Date(advisory.created_at).toLocaleDateString('en-IN')} ·{' '}
        {advisory.raw_ai_response.includes('Mock') ? 'Rule-based plan' : 'AI-generated plan'}
      </p>
    </div>
  );
};

export default WeeklyAdvisory;
