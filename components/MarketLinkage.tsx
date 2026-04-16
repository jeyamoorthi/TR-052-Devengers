import React, { useContext, useEffect, useState, useCallback } from 'react';
import {
  ShoppingCart,
  Star,
  Phone,
  MapPin,
  TrendingUp,
  Filter,
  CheckCircle,
  Loader,
  Package,
  RefreshCw,
  ChevronRight,
  BarChart2,
} from 'lucide-react';
import { AppContext } from '../App';
import { marketLinkageService } from '../services/marketLinkageService';
import { VendorBuyer, MarketTrend } from '../types';

const TYPE_COLORS: Record<string, string> = {
  Buyer: 'bg-sky-100 text-sky-700 border-sky-200',
  Wholesaler: 'bg-indigo-100 text-indigo-700 border-indigo-200',
  Exporter: 'bg-violet-100 text-violet-700 border-violet-200',
  Retailer: 'bg-pink-100 text-pink-700 border-pink-200',
  FPO: 'bg-emerald-100 text-emerald-700 border-emerald-200',
};

const TREND_COLORS: Record<string, string> = {
  up: 'text-emerald-600',
  down: 'text-red-600',
  stable: 'text-amber-600',
};

const DEMAND_STYLES: Record<string, string> = {
  Low: 'bg-gray-100 text-gray-600',
  Medium: 'bg-blue-100 text-blue-700',
  High: 'bg-emerald-100 text-emerald-700',
  'Very High': 'bg-violet-100 text-violet-700',
};

const StarRating: React.FC<{ rating: number }> = ({ rating }) => (
  <div className="flex items-center gap-0.5">
    {[1, 2, 3, 4, 5].map((s) => (
      <Star
        key={s}
        size={12}
        className={s <= Math.round(rating) ? 'text-amber-400' : 'text-gray-200'}
        fill={s <= Math.round(rating) ? 'currentColor' : 'currentColor'}
      />
    ))}
    <span className="ml-1 text-xs text-[var(--text-700)]">{rating.toFixed(1)}</span>
  </div>
);

const MarketLinkage: React.FC = () => {
  const context = useContext(AppContext);
  if (!context) return null;
  const { user } = context;

  const [tab, setTab] = useState<'vendors' | 'trends' | 'connections'>('vendors');
  const [vendors, setVendors] = useState<VendorBuyer[]>([]);
  const [trends, setTrends] = useState<MarketTrend[]>([]);
  const [loading, setLoading] = useState(true);
  const [connectedIds, setConnectedIds] = useState<Set<string>>(new Set());
  const [connectingId, setConnectingId] = useState<string | null>(null);
  const [cropFilter, setCropFilter] = useState('');
  const [typeFilter, setTypeFilter] = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    try {
      await marketLinkageService.seed();
      const [allVendors, allTrends] = await Promise.all([
        marketLinkageService.getAllVendors(),
        marketLinkageService.getMarketTrends(),
      ]);
      setVendors(allVendors);
      setTrends(allTrends);
      if (user) {
        const connected = marketLinkageService.getConnectedVendorIds(user.uid);
        setConnectedIds(new Set(connected));
      }
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => { load(); }, [load]);

  const handleConnect = async (vendorId: string) => {
    if (!user || connectedIds.has(vendorId)) return;
    setConnectingId(vendorId);
    try {
      await marketLinkageService.connectToVendor(user.uid, vendorId);
      setConnectedIds((prev) => new Set([...prev, vendorId]));
    } finally {
      setConnectingId(null);
    }
  };

  const filteredVendors = vendors.filter((v) => {
    const cropMatch = cropFilter
      ? v.crops_interested.some((c) => c.toLowerCase().includes(cropFilter.toLowerCase()))
      : true;
    const typeMatch = typeFilter ? v.type === typeFilter : true;
    return cropMatch && typeMatch;
  });

  const connectedVendors = vendors.filter((v) => connectedIds.has(v.id));

  const formatPrice = (n: number) =>
    `₹${n.toLocaleString('en-IN')}/qtl`;

  if (loading) {
    return (
      <div className="app-card flex items-center justify-center p-10">
        <div className="text-center">
          <Loader size={28} className="mx-auto mb-3 animate-spin text-teal-600" />
          <p className="font-bold text-[var(--text-900)]">Loading marketplace…</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="app-card overflow-hidden">
        <div className="bg-gradient-to-r from-teal-600 to-cyan-600 p-5">
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="text-xs font-bold uppercase tracking-[0.2em] text-teal-100">Marketplace</p>
              <h1 className="mt-1 text-2xl font-extrabold text-white">Market Linkage</h1>
              <p className="mt-1 text-sm text-teal-100">
                {vendors.length} buyers · {connectedIds.size} connected · {trends.length} price trends
              </p>
            </div>
            <button
              onClick={load}
              className="flex items-center gap-2 rounded-xl bg-white/15 px-3 py-2 text-xs font-bold text-white hover:bg-white/25"
            >
              <RefreshCw size={14} /> Refresh
            </button>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex border-b border-[var(--line)]">
          {(['vendors', 'trends', 'connections'] as const).map((t) => (
            <button
              key={t}
              onClick={() => setTab(t)}
              className={`flex-1 py-3 text-xs font-bold capitalize transition ${
                tab === t
                  ? 'border-b-2 border-teal-600 text-teal-700'
                  : 'text-[var(--text-700)] hover:text-[var(--text-900)]'
              }`}
            >
              {t === 'vendors' ? `Buyers (${filteredVendors.length})` : t === 'trends' ? 'Price Trends' : `Connections (${connectedIds.size})`}
            </button>
          ))}
        </div>
      </div>

      {/* Vendors Tab */}
      {tab === 'vendors' && (
        <div className="space-y-3">
          {/* Filters */}
          <div className="app-card p-3">
            <div className="grid grid-cols-2 gap-2">
              <div className="flex items-center gap-2 rounded-xl border border-[var(--line)] bg-white px-3 py-2">
                <Filter size={14} className="text-[var(--text-700)]" />
                <input
                  type="text"
                  value={cropFilter}
                  onChange={(e) => setCropFilter(e.target.value)}
                  placeholder="Filter by crop…"
                  className="flex-1 bg-transparent text-sm font-semibold text-[var(--text-900)] outline-none"
                />
              </div>
              <select
                value={typeFilter}
                onChange={(e) => setTypeFilter(e.target.value)}
                className="rounded-xl border border-[var(--line)] bg-white px-3 py-2 text-sm font-semibold text-[var(--text-900)] outline-none"
              >
                <option value="">All Types</option>
                {['Buyer', 'Wholesaler', 'Exporter', 'Retailer', 'FPO'].map((t) => (
                  <option key={t} value={t}>{t}</option>
                ))}
              </select>
            </div>
          </div>

          {filteredVendors.map((v) => (
            <div key={v.id} className="app-card p-4">
              <div className="flex items-start gap-3">
                <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-teal-400 to-cyan-500 text-xl font-extrabold text-white">
                  {v.name.charAt(0)}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <p className="font-bold text-[var(--text-900)] leading-tight">{v.name}</p>
                      <span className={`mt-0.5 inline-block rounded-full border px-2 py-0.5 text-xs font-bold ${TYPE_COLORS[v.type]}`}>
                        {v.type}
                      </span>
                    </div>
                    {connectedIds.has(v.id) ? (
                      <span className="flex shrink-0 items-center gap-1 rounded-lg bg-emerald-100 px-2 py-1 text-xs font-bold text-emerald-700">
                        <CheckCircle size={12} /> Connected
                      </span>
                    ) : (
                      <button
                        onClick={() => handleConnect(v.id)}
                        disabled={connectingId === v.id}
                        className="flex shrink-0 items-center gap-1.5 rounded-xl bg-teal-600 px-3 py-1.5 text-xs font-bold text-white transition hover:bg-teal-700 disabled:opacity-60"
                      >
                        {connectingId === v.id ? <Loader size={12} className="animate-spin" /> : <Phone size={12} />}
                        Connect
                      </button>
                    )}
                  </div>

                  <StarRating rating={v.rating} />

                  <div className="mt-2 flex items-center gap-2 text-xs text-[var(--text-700)]">
                    <MapPin size={11} /> {v.district}, {v.state}
                  </div>

                  <div className="mt-2 flex flex-wrap gap-1">
                    {v.crops_interested.slice(0, 4).map((c) => (
                      <span key={c} className="rounded-full bg-[var(--surface)] border border-[var(--line)] px-2 py-0.5 text-xs font-semibold text-[var(--text-700)]">
                        {c}
                      </span>
                    ))}
                    {v.crops_interested.length > 4 && (
                      <span className="rounded-full bg-[var(--surface)] border border-[var(--line)] px-2 py-0.5 text-xs font-semibold text-[var(--text-700)]">
                        +{v.crops_interested.length - 4}
                      </span>
                    )}
                  </div>

                  <div className="mt-2 grid grid-cols-2 gap-2 text-xs">
                    <div className="flex items-center gap-1 rounded-lg bg-[var(--surface)] px-2 py-1.5">
                      <Package size={11} className="text-teal-600" />
                      <span className="text-[var(--text-700)]">Min <strong className="text-[var(--text-900)]">{v.min_quantity_qtl} qtl</strong></span>
                    </div>
                    <div className="flex items-center gap-1 rounded-lg bg-emerald-50 px-2 py-1.5">
                      <TrendingUp size={11} className="text-emerald-600" />
                      <span className="text-emerald-700 font-semibold">+{v.price_premium_percent}% premium</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Market Trends Tab */}
      {tab === 'trends' && (
        <div className="space-y-3">
          <div className="app-card p-4">
            <div className="flex items-center gap-2 mb-3">
              <BarChart2 size={16} className="text-teal-600" />
              <p className="font-bold text-[var(--text-900)]">APMC / Mandi Price Trends</p>
            </div>
            <div className="space-y-2">
              {trends.map((t) => (
                <div key={t.id} className="rounded-xl border border-[var(--line)] bg-[var(--surface)] p-3">
                  <div className="flex items-center justify-between gap-3">
                    <div>
                      <div className="flex items-center gap-2">
                        <p className="font-bold text-[var(--text-900)]">{t.crop}</p>
                        <span className={`rounded-full px-2 py-0.5 text-xs font-bold ${DEMAND_STYLES[t.demand_level]}`}>
                          {t.demand_level} demand
                        </span>
                      </div>
                      <p className="mt-0.5 text-xs text-[var(--text-700)]">{t.market_name} · {t.state}</p>
                    </div>
                    <div className="text-right">
                      <p className="font-extrabold text-[var(--text-900)]">{formatPrice(t.modal_price)}</p>
                      <p className={`text-xs font-semibold flex items-center justify-end gap-1 ${TREND_COLORS[t.trend]}`}>
                        <TrendingUp size={11} /> {t.trend}
                      </p>
                    </div>
                  </div>
                  <div className="mt-2 flex items-center gap-2 text-xs text-[var(--text-700)]">
                    <span>Min: {formatPrice(t.min_price)}</span>
                    <ChevronRight size={12} />
                    <span>Max: {formatPrice(t.max_price)}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Connections Tab */}
      {tab === 'connections' && (
        <div className="space-y-3">
          {connectedVendors.length === 0 ? (
            <div className="app-card p-8 text-center">
              <ShoppingCart size={36} className="mx-auto mb-3 text-teal-400" />
              <p className="font-bold text-[var(--text-900)]">No connections yet</p>
              <p className="mt-1 text-sm text-[var(--text-700)]">
                Browse the Buyers tab and connect with vendors for your crops.
              </p>
            </div>
          ) : (
            connectedVendors.map((v) => (
              <div key={v.id} className="app-card p-4">
                <div className="flex items-center gap-3">
                  <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-teal-500 to-cyan-500 text-xl font-extrabold text-white">
                    {v.name.charAt(0)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-bold text-[var(--text-900)]">{v.name}</p>
                    <StarRating rating={v.rating} />
                    <div className="mt-1 flex items-center gap-2 text-xs text-[var(--text-700)]">
                      <Phone size={11} /> {v.contact}
                    </div>
                  </div>
                  <span className="flex shrink-0 items-center gap-1 rounded-xl bg-emerald-100 px-3 py-1.5 text-xs font-bold text-emerald-700">
                    <CheckCircle size={12} /> Active
                  </span>
                </div>
              </div>
            ))
          )}
        </div>
      )}
    </div>
  );
};

export default MarketLinkage;
