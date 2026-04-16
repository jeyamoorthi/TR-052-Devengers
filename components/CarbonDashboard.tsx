import React, { useContext, useMemo } from 'react';
import { AppContext } from '../App';
import { carbonService, CarbonProfile } from '../services/carbonService';
import { weatherService } from '../services/weatherService';
import { TrendingUp, Leaf, DollarSign, Award, BarChart2, ArrowUpRight } from 'lucide-react';

interface Props {
  weatherData: any;
}

const badgeColors: Record<string, string> = {
  Platinum: 'from-cyan-500 to-blue-600',
  Gold: 'from-yellow-400 to-amber-500',
  Silver: 'from-gray-300 to-gray-500',
  Bronze: 'from-amber-600 to-orange-700',
};

const badgeText: Record<string, string> = {
  Platinum: 'text-cyan-700',
  Gold: 'text-amber-700',
  Silver: 'text-gray-600',
  Bronze: 'text-orange-700',
};

const CarbonDashboard: React.FC<Props> = ({ weatherData }) => {
  const context = useContext(AppContext);
  if (!context || !context.user || !weatherData) return null;
  const { user } = context;

  const profile: CarbonProfile = useMemo(() =>
    carbonService.calculate(user, weatherData), [user, weatherData]);

  const maxCredit = Math.max(...profile.creditHistory.map(h => h.credits));

  return (
    <div className="space-y-5 pb-6">
      {/* Header */}
      <div>
        <h2 className="text-2xl font-extrabold text-gray-900">Carbon Dashboard</h2>
        <p className="text-gray-500 text-sm mt-1">Turn your sustainable practices into real income</p>
      </div>

      {/* Hero Card */}
      <div className="relative rounded-3xl overflow-hidden bg-gradient-to-br from-green-800 to-emerald-600 p-6 shadow-xl text-white">
        <div className="absolute top-0 right-0 w-48 h-48 bg-white/10 rounded-full -translate-y-1/2 translate-x-1/4" />
        <div className="absolute bottom-0 left-0 w-32 h-32 bg-white/5 rounded-full translate-y-1/2 -translate-x-1/4" />

        <div className="relative z-10">
          <div className="flex items-center gap-2 mb-1 opacity-80">
            <Leaf size={16} />
            <span className="text-sm font-semibold uppercase tracking-widest">This Season</span>
          </div>
          <div className="flex items-end gap-3 mt-2">
            <div>
              <p className="text-5xl font-black">{profile.co2SavedTons.toFixed(1)}</p>
              <p className="text-green-200 text-sm mt-1">Tons of CO₂ saved</p>
            </div>
            <div className="ml-auto text-right">
              <p className="text-3xl font-black">₹{profile.estimatedValueINR.toLocaleString('en-IN')}</p>
              <p className="text-green-200 text-sm">carbon credit value</p>
            </div>
          </div>
          <div className="mt-4 pt-4 border-t border-white/20 flex justify-between items-center">
            <div>
              <p className="text-green-200 text-xs">Yearly Projection</p>
              <p className="text-xl font-bold">₹{profile.yearlyProjectionINR.toLocaleString('en-IN')}</p>
            </div>
            <div className={`px-4 py-2 rounded-full bg-gradient-to-r ${badgeColors[profile.sustainabilityBadge]} text-white font-bold text-sm shadow-lg`}>
              🏆 {profile.sustainabilityBadge} Farmer
            </div>
          </div>
        </div>
      </div>

      {/* Emission Score */}
      <div className="bg-white rounded-3xl p-5 shadow-sm border border-gray-100">
        <div className="flex justify-between items-center mb-3">
          <h3 className="font-bold text-gray-800">Green Score</h3>
          <span className={`text-2xl font-black ${profile.emissionScore >= 65 ? 'text-green-600' : 'text-amber-500'}`}>
            {profile.emissionScore}/100
          </span>
        </div>
        <div className="w-full bg-gray-100 rounded-full h-4 overflow-hidden">
          <div
            className="h-4 rounded-full transition-all duration-1000"
            style={{
              width: `${profile.emissionScore}%`,
              background: `linear-gradient(90deg, #16a34a, #4ade80)`
            }}
          />
        </div>
        <p className="text-xs text-gray-500 mt-2">
          Your farm emits <strong>{profile.emissionScore >= 65 ? 'significantly less' : 'less'}</strong> CO₂ than average Indian farms
        </p>
      </div>

      {/* Breakdown */}
      <div className="bg-white rounded-3xl p-5 shadow-sm border border-gray-100">
        <h3 className="font-bold text-gray-800 mb-4">Carbon Breakdown</h3>
        <div className="space-y-3">
          {profile.breakdown.map((item, i) => (
            <div key={i} className="flex items-center gap-3">
              <span className="text-2xl">{item.icon}</span>
              <div className="flex-1">
                <div className="flex justify-between mb-1">
                  <span className="text-sm font-medium text-gray-700">{item.category}</span>
                  <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${
                    item.contribution === 'Positive' ? 'bg-green-100 text-green-700' :
                    item.contribution === 'Negative' ? 'bg-red-100 text-red-700' :
                    'bg-gray-100 text-gray-600'
                  }`}>
                    {item.contribution === 'Positive' ? '▲' : item.contribution === 'Negative' ? '▼' : '—'} {item.contribution}
                  </span>
                </div>
                <div className="w-full bg-gray-100 rounded-full h-2">
                  <div
                    className={`h-2 rounded-full ${item.contribution === 'Positive' ? 'bg-green-500' : item.contribution === 'Negative' ? 'bg-red-400' : 'bg-gray-400'}`}
                    style={{ width: `${Math.min(100, Math.abs(item.savedKg) / 5)}%` }}
                  />
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Credit History Chart */}
      <div className="bg-white rounded-3xl p-5 shadow-sm border border-gray-100">
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-bold text-gray-800">6-Month Credit History</h3>
          <div className="flex items-center gap-1 text-green-600 text-sm font-semibold">
            <TrendingUp size={16} />
            <span>+18%</span>
          </div>
        </div>
        <div className="flex items-end gap-2 h-28">
          {profile.creditHistory.map((h, i) => (
            <div key={i} className="flex-1 flex flex-col items-center gap-1">
              <div
                className="w-full rounded-t-lg bg-gradient-to-t from-green-600 to-green-400 transition-all"
                style={{ height: `${(h.credits / maxCredit) * 96}px` }}
              />
              <span className="text-[9px] text-gray-500 font-medium">{h.month}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Mock Marketplace CTA */}
      <div className="bg-gradient-to-r from-emerald-600 to-teal-600 rounded-3xl p-5 text-white shadow-lg">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="font-bold text-lg">List on Carbon Market</h3>
            <p className="text-emerald-100 text-sm mt-1">Connect to verified buyers — get ₹{profile.estimatedValueINR.toLocaleString('en-IN')}</p>
          </div>
          <button className="bg-white text-emerald-700 font-bold px-4 py-2 rounded-xl text-sm flex items-center gap-1 active:scale-95 transition-transform">
            Sell Credits <ArrowUpRight size={14} />
          </button>
        </div>
        <div className="mt-4 flex gap-3">
          {['Verra', 'Gold Standard', 'IndiaCarbon'].map(buyer => (
            <div key={buyer} className="bg-white/20 rounded-xl px-3 py-1.5 text-xs font-semibold">
              {buyer}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default CarbonDashboard;
