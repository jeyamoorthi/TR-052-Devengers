import React, { useContext, useEffect, useState, useCallback } from 'react';
import {
  Sparkles,
  RefreshCw,
  TrendingUp,
  Leaf,
  AlertTriangle,
  ChevronDown,
  ChevronUp,
  Loader,
  CheckCircle,
  BarChart3,
  Users,
  Phone,
  Star,
  Package,
} from 'lucide-react';
import { AppContext } from '../App';
import { cropRecommendationService } from '../services/cropRecommendationService';
import { marketLinkageService } from '../services/marketLinkageService';
import { CropRecommendationResult, VendorBuyer } from '../types';

const DEMAND_STYLES: Record<string, string> = {
  Low: 'bg-gray-100 text-gray-600',
  Medium: 'bg-blue-100 text-blue-700',
  High: 'bg-emerald-100 text-emerald-700',
  'Very High': 'bg-violet-100 text-violet-700',
};

const RISK_STYLES: Record<string, string> = {
  Low: 'text-emerald-600',
  Medium: 'text-amber-600',
  High: 'text-red-600',
};

const TYPE_COLORS: Record<string, string> = {
  Buyer: 'bg-sky-100 text-sky-700',
  Wholesaler: 'bg-indigo-100 text-indigo-700',
  Exporter: 'bg-violet-100 text-violet-700',
  Retailer: 'bg-pink-100 text-pink-700',
  FPO: 'bg-emerald-100 text-emerald-700',
};

const GRADIENT_CLASSES = [
  'from-amber-500 to-orange-500',
  'from-violet-600 to-indigo-600',
  'from-emerald-600 to-teal-600',
  'from-rose-500 to-pink-500',
];

const CropRecommendation: React.FC = () => {
  const context = useContext(AppContext);
  if (!context) return null;
  const { user } = context;

  const [recs, setRecs] = useState<CropRecommendationResult[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [connectingId, setConnectingId] = useState<string | null>(null);
  const [connectedIds, setConnectedIds] = useState<Set<string>>(new Set());
  const [error, setError] = useState('');

  const loadRecs = useCallback(async (force = false) => {
    if (!user) return;
    force ? setRefreshing(true) : setLoading(true);
    setError('');
    try {
      const data = await cropRecommendationService.getRecommendations(user, force);
      setRecs(data);
      const connected = marketLinkageService.getConnectedVendorIds(user.uid);
      setConnectedIds(new Set(connected));
    } catch {
      setError('Could not load recommendations. Please try again.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [user]);

  useEffect(() => { loadRecs(); }, [loadRecs]);

  const handleConnect = async (vendor: VendorBuyer) => {
    if (!user || connectedIds.has(vendor.id)) return;
    setConnectingId(vendor.id);
    try {
      await marketLinkageService.connectToVendor(user.uid, vendor.id);
      setConnectedIds((prev) => new Set([...prev, vendor.id]));
    } finally {
      setConnectingId(null);
    }
  };

  const formatRevenue = (n: number) =>
    n >= 100000 ? `₹${(n / 100000).toFixed(1)}L` : `₹${(n / 1000).toFixed(0)}K`;

  if (loading) {
    return (
      <div className="app-card p-8 text-center">
        <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-amber-100">
          <Loader size={28} className="animate-spin text-amber-600" />
        </div>
        <p className="font-bold text-[var(--text-900)]">Analysing your farm profile…</p>
        <p className="mt-1 text-sm text-[var(--text-700)]">AI is matching soil, weather & market data</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="app-card p-8 text-center">
        <AlertTriangle size={32} className="mx-auto mb-3 text-amber-500" />
        <p className="font-bold text-[var(--text-900)]">{error}</p>
        <button onClick={() => loadRecs(true)} className="mt-4 rounded-xl bg-amber-500 px-5 py-2 text-sm font-bold text-white">
          Retry
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="app-card overflow-hidden">
        <div className="bg-gradient-to-r from-amber-500 to-orange-500 p-5">
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="text-xs font-bold uppercase tracking-[0.2em] text-amber-100">AI Recommendation Engine</p>
              <h1 className="mt-1 text-2xl font-extrabold text-white">Crop Opportunities</h1>
              <p className="mt-1 text-sm text-amber-100">
                {recs.filter((r) => r.exotic).length} exotic · {recs.length} total recommendations
              </p>
            </div>
            <button
              onClick={() => loadRecs(true)}
              disabled={refreshing}
              className="flex items-center gap-2 rounded-xl bg-white/15 px-3 py-2 text-xs font-bold text-white hover:bg-white/25 disabled:opacity-60"
            >
              <RefreshCw size={14} className={refreshing ? 'animate-spin' : ''} />
              {refreshing ? 'Updating…' : 'Refresh AI'}
            </button>
          </div>
        </div>
      </div>

      {/* Crop cards */}
      {recs.map((rec, idx) => (
        <div key={rec.id} className="app-card overflow-hidden">
          {/* Card header gradient */}
          <div className={`bg-gradient-to-r ${GRADIENT_CLASSES[idx % GRADIENT_CLASSES.length]} p-4`}>
            <div className="flex items-start justify-between gap-3">
              <div>
                <div className="flex items-center gap-2">
                  <p className="text-lg font-extrabold text-white">{rec.crop_name}</p>
                  {rec.exotic && (
                    <span className="flex items-center gap-1 rounded-full bg-white/20 px-2 py-0.5 text-xs font-bold text-white">
                      <Sparkles size={10} /> Exotic
                    </span>
                  )}
                </div>
                <p className="text-sm text-white/80">
                  Grow: {rec.grow_duration_days} days · {formatRevenue(rec.estimated_revenue_per_acre)}/acre
                </p>
              </div>
              {/* Suitability ring */}
              <div className="flex flex-col items-center">
                <div className="flex h-12 w-12 items-center justify-center rounded-full bg-white/20 text-lg font-extrabold text-white">
                  {rec.suitability_score}
                </div>
                <p className="mt-0.5 text-xs text-white/70">Score</p>
              </div>
            </div>
          </div>

          {/* Metrics strip */}
          <div className="grid grid-cols-3 divide-x divide-[var(--line)] border-b border-[var(--line)]">
            <div className="p-3 text-center">
              <div className="flex items-center justify-center gap-1">
                <Package size={13} className="text-[var(--text-700)]" />
                <p className="font-bold text-[var(--text-900)]">{rec.expected_yield_qtl_acre} qtl</p>
              </div>
              <p className="text-xs text-[var(--text-700)]">Yield/Acre</p>
            </div>
            <div className="p-3 text-center">
              <span className={`inline-block rounded-full px-2 py-0.5 text-xs font-bold ${DEMAND_STYLES[rec.market_demand]}`}>
                {rec.market_demand}
              </span>
              <p className="text-xs text-[var(--text-700)] mt-1">Demand</p>
            </div>
            <div className="p-3 text-center">
              <p className={`font-bold ${RISK_STYLES[rec.risk_level]}`}>
                {rec.risk_level}
              </p>
              <p className="text-xs text-[var(--text-700)]">Risk</p>
            </div>
          </div>

          {/* Reasons pills */}
          <div className="p-4">
            <div className="flex flex-wrap gap-1.5 mb-3">
              {rec.reasons.map((r, i) => (
                <span key={i} className="rounded-full bg-[var(--surface)] border border-[var(--line)] px-2.5 py-1 text-xs font-semibold text-[var(--text-700)]">
                  {r}
                </span>
              ))}
            </div>

            {/* Expandable details */}
            <button
              onClick={() => setExpandedId(expandedId === rec.id ? null : rec.id)}
              className="flex w-full items-center justify-between rounded-xl border border-[var(--line)] bg-[var(--surface)] px-4 py-2.5 text-sm font-bold text-[var(--text-700)] transition hover:border-amber-400"
            >
              View Details & Vendor Matches ({rec.vendor_matches.length})
              {expandedId === rec.id ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
            </button>

            {expandedId === rec.id && (
              <div className="mt-3 space-y-3">
                {/* Match context */}
                <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
                  {[
                    { label: 'Soil', value: rec.soil_match, icon: Leaf },
                    { label: 'Weather', value: rec.weather_match, icon: BarChart3 },
                    { label: 'Market', value: rec.market_match, icon: TrendingUp },
                  ].map(({ label, value, icon: Icon }) => (
                    <div key={label} className="rounded-xl bg-[var(--surface)] border border-[var(--line)] p-3">
                      <div className="flex items-center gap-1.5 mb-1">
                        <Icon size={13} className="text-amber-600" />
                        <p className="text-xs font-bold uppercase tracking-wide text-[var(--text-700)]">{label}</p>
                      </div>
                      <p className="text-xs text-[var(--text-900)]">{value}</p>
                    </div>
                  ))}
                </div>

                {/* Vendor matches */}
                {rec.vendor_matches.length > 0 && (
                  <div>
                    <div className="flex items-center gap-2 mb-2">
                      <Users size={14} className="text-amber-600" />
                      <p className="text-xs font-bold uppercase tracking-wide text-[var(--text-700)]">Matched Buyers</p>
                    </div>
                    <div className="space-y-2">
                      {rec.vendor_matches.slice(0, 3).map((vendor) => (
                        <div key={vendor.id} className="rounded-xl border border-[var(--line)] bg-white p-3 flex items-center gap-3">
                          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-amber-100 text-lg font-extrabold text-amber-700">
                            {vendor.name.charAt(0)}
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="font-bold text-sm text-[var(--text-900)] truncate">{vendor.name}</p>
                            <div className="flex items-center gap-2 mt-0.5">
                              <span className={`rounded-full px-1.5 py-0.5 text-xs font-bold ${TYPE_COLORS[vendor.type]}`}>
                                {vendor.type}
                              </span>
                              <span className="flex items-center gap-0.5 text-xs text-amber-600">
                                <Star size={10} fill="currentColor" /> {vendor.rating}
                              </span>
                              <span className="text-xs text-[var(--text-700)]">Min {vendor.min_quantity_qtl} qtl</span>
                            </div>
                            <p className="mt-0.5 text-xs text-emerald-700 font-semibold">
                              +{vendor.price_premium_percent}% above mandi price
                            </p>
                          </div>
                          <div className="flex flex-col items-end gap-1.5 shrink-0">
                            {connectedIds.has(vendor.id) ? (
                              <span className="flex items-center gap-1 rounded-lg bg-emerald-100 px-2 py-1 text-xs font-bold text-emerald-700">
                                <CheckCircle size={12} /> Connected
                              </span>
                            ) : (
                              <button
                                onClick={() => handleConnect(vendor)}
                                disabled={connectingId === vendor.id}
                                className="flex items-center gap-1 rounded-lg bg-amber-500 px-2.5 py-1.5 text-xs font-bold text-white transition hover:bg-amber-600 disabled:opacity-60"
                              >
                                {connectingId === vendor.id ? (
                                  <Loader size={12} className="animate-spin" />
                                ) : (
                                  <Phone size={12} />
                                )}
                                Connect
                              </button>
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
        </div>
      ))}
    </div>
  );
};

export default CropRecommendation;
