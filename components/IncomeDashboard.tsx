import React, { useContext, useMemo, useState } from 'react';
import { AppContext } from '../App';
import { financeService, GovtScheme } from '../services/financeService';
import { carbonService } from '../services/carbonService';
import { TrendingUp, TrendingDown, Minus, ExternalLink, ChevronDown, ChevronUp, IndianRupee } from 'lucide-react';

interface Props {
  weatherData: any;
}

const IncomeDashboard: React.FC<Props> = ({ weatherData }) => {
  const context = useContext(AppContext);
  if (!context || !context.user || !weatherData) return null;
  const { user } = context;

  const [expandedScheme, setExpandedScheme] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'overview' | 'schemes' | 'market'>('overview');

  const carbonProfile = useMemo(() => carbonService.calculate(user, weatherData), [user, weatherData]);
  const incomeSummary = useMemo(() =>
    financeService.getIncomeSummary(user, carbonProfile.estimatedValueINR), [user, carbonProfile]);

  const { marketIntelligence: mi, schemes, profitInsights, cropRevenue, carbonCreditValue, schemesBenefit, totalPotentialINR } = incomeSummary;

  const trendIcon = mi.trend === 'Rising' ? <TrendingUp size={16} className="text-green-600" /> :
    mi.trend === 'Falling' ? <TrendingDown size={16} className="text-red-500" /> :
    <Minus size={16} className="text-gray-400" />;

  const categoryColor: Record<GovtScheme['category'], string> = {
    Subsidy: 'bg-green-100 text-green-800',
    Insurance: 'bg-blue-100 text-blue-800',
    Credit: 'bg-purple-100 text-purple-800',
    Technology: 'bg-cyan-100 text-cyan-800',
  };

  return (
    <div className="space-y-5 pb-6">
      {/* Header */}
      <div>
        <h2 className="text-2xl font-extrabold text-gray-900">Income Hub</h2>
        <p className="text-gray-500 text-sm mt-1">Your complete farm revenue picture</p>
      </div>

      {/* Total Potential */}
      <div className="bg-gradient-to-br from-indigo-700 to-purple-700 rounded-3xl p-6 text-white shadow-xl relative overflow-hidden">
        <div className="absolute top-0 right-0 w-56 h-56 bg-white/10 rounded-full -translate-y-1/3 translate-x-1/3" />
        <div className="relative z-10">
          <p className="text-indigo-200 text-sm font-semibold uppercase tracking-widest">Total Season Potential</p>
          <p className="text-4xl font-black mt-2">₹{totalPotentialINR.toLocaleString('en-IN')}</p>
          <p className="text-indigo-200 text-sm mt-1">across crop sales + carbon + schemes</p>

          <div className="mt-4 grid grid-cols-3 gap-3">
            {[
              { label: 'Crop Sales', value: cropRevenue, color: 'bg-white/20' },
              { label: 'Carbon Credits', value: carbonCreditValue, color: 'bg-emerald-500/40' },
              { label: 'Govt Schemes', value: schemesBenefit, color: 'bg-indigo-500/40' },
            ].map((item, i) => (
              <div key={i} className={`${item.color} rounded-2xl p-3 text-center`}>
                <p className="text-white font-black text-lg">₹{(item.value / 1000).toFixed(0)}K</p>
                <p className="text-white/70 text-[10px] font-medium mt-0.5 leading-tight">{item.label}</p>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Tab Navigation */}
      <div className="flex gap-2 bg-gray-100 rounded-2xl p-1">
        {(['overview', 'market', 'schemes'] as const).map(tab => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`flex-1 py-2 rounded-xl text-sm font-semibold capitalize transition-all ${
              activeTab === tab ? 'bg-white shadow text-gray-900' : 'text-gray-500'
            }`}
          >
            {tab === 'overview' ? 'Overview' : tab === 'market' ? '📈 Market' : '🏛️ Schemes'}
          </button>
        ))}
      </div>

      {/* TAB: Overview */}
      {activeTab === 'overview' && (
        <div className="space-y-4">
          {/* Profit Insights */}
          <div className="bg-white rounded-3xl p-5 shadow-sm border border-gray-100 space-y-3">
            <h3 className="font-bold text-gray-800">💡 Profit Insights</h3>
            {profitInsights.map((insight, i) => (
              <div key={i} className="text-sm text-gray-700 bg-gray-50 rounded-xl p-3 leading-relaxed">
                {insight}
              </div>
            ))}
          </div>

          {/* Quick Actions */}
          <div className="grid grid-cols-2 gap-3">
            {[
              { label: 'e-NAM Listing', sub: 'Better mandi prices', icon: '📱', color: 'bg-pink-50 border-pink-200' },
              { label: 'PM-KISAN Apply', sub: '₹6,000 entitlement', icon: '🌾', color: 'bg-green-50 border-green-200' },
              { label: 'Sell Carbon Credits', sub: `₹${carbonCreditValue.toLocaleString('en-IN')} waiting`, icon: '♻️', color: 'bg-teal-50 border-teal-200' },
              { label: 'Kisan Credit Card', sub: '4% interest rate', icon: '💳', color: 'bg-purple-50 border-purple-200' },
            ].map((action, i) => (
              <div
                key={i}
                className={`${action.color} border rounded-2xl p-4 cursor-pointer active:scale-95 transition-transform`}
              >
                <span className="text-2xl">{action.icon}</span>
                <p className="font-bold text-gray-900 mt-2 text-sm">{action.label}</p>
                <p className="text-xs text-gray-500 mt-0.5">{action.sub}</p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* TAB: Market */}
      {activeTab === 'market' && (
        <div className="space-y-4">
          {/* Current Price Card */}
          <div className="bg-white rounded-3xl p-5 shadow-sm border border-gray-100">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-bold text-gray-800">{mi.crop} Market Price</h3>
              <div className={`flex items-center gap-1 px-3 py-1 rounded-full text-sm font-bold ${
                mi.trend === 'Rising' ? 'bg-green-100 text-green-700' :
                mi.trend === 'Falling' ? 'bg-red-100 text-red-700' :
                'bg-gray-100 text-gray-600'
              }`}>
                {trendIcon}
                <span>{mi.trendPercent > 0 ? '+' : ''}{mi.trendPercent}%</span>
              </div>
            </div>

            <div className="flex justify-between">
              <div>
                <p className="text-xs text-gray-400">Market Price</p>
                <p className="text-3xl font-black text-gray-900">₹{mi.currentPricePerQuintal.toLocaleString('en-IN')}</p>
                <p className="text-xs text-gray-500 mt-0.5">per quintal</p>
              </div>
              {mi.mspPriceINR > 0 && (
                <div className="text-right">
                  <p className="text-xs text-gray-400">Govt MSP</p>
                  <p className={`text-xl font-bold ${mi.currentPricePerQuintal >= mi.mspPriceINR ? 'text-green-600' : 'text-red-500'}`}>
                    ₹{mi.mspPriceINR.toLocaleString('en-IN')}
                  </p>
                  <p className={`text-xs font-semibold mt-0.5 ${mi.currentPricePerQuintal >= mi.mspPriceINR ? 'text-green-600' : 'text-red-500'}`}>
                    {mi.currentPricePerQuintal >= mi.mspPriceINR ? '▲ Above MSP' : '▼ Below MSP'}
                  </p>
                </div>
              )}
            </div>

            <div className="mt-4 bg-indigo-50 rounded-2xl p-3">
              <p className="text-xs text-indigo-800 font-semibold">📅 Best Time to Sell</p>
              <p className="text-sm text-indigo-900 mt-1">{mi.bestTimeToSell}</p>
            </div>

            {mi.potentialProfitINR > 0 && (
              <div className="mt-3 bg-green-50 rounded-2xl p-3">
                <p className="text-xs text-green-800 font-semibold">💰 Potential Extra Profit</p>
                <p className="text-lg font-black text-green-700 mt-1">+₹{mi.potentialProfitINR.toLocaleString('en-IN')}</p>
                <p className="text-xs text-green-700">if you wait until {mi.predictedPeakMonth}</p>
              </div>
            )}
          </div>

          {/* Crop Revenue Estimate */}
          <div className="bg-white rounded-3xl p-5 shadow-sm border border-gray-100">
            <h3 className="font-bold text-gray-800 mb-3">Estimated Crop Revenue</h3>
            <div className="flex items-center gap-2">
              <IndianRupee className="text-indigo-600" size={28} />
              <p className="text-3xl font-black text-indigo-700">{(cropRevenue / 1000).toFixed(0)}K</p>
              <p className="text-gray-500 text-sm">this season</p>
            </div>
            <p className="text-xs text-gray-400 mt-2">Based on {user.farmSizeAcres || 2} acres × 18 quintals/acre × ₹{mi.currentPricePerQuintal}/quintal</p>
          </div>
        </div>
      )}

      {/* TAB: Schemes */}
      {activeTab === 'schemes' && (
        <div className="space-y-3">
          {schemes.map((scheme) => (
            <div
              key={scheme.id}
              className="bg-white rounded-3xl shadow-sm border border-gray-100 overflow-hidden"
            >
              <button
                className="w-full p-4 text-left"
                onClick={() => setExpandedScheme(expandedScheme === scheme.id ? null : scheme.id)}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div
                      className="w-10 h-10 rounded-2xl flex items-center justify-center text-xl"
                      style={{ backgroundColor: scheme.color + '20' }}
                    >
                      {scheme.icon}
                    </div>
                    <div>
                      <p className="font-bold text-gray-900 text-sm">{scheme.name}</p>
                      <p className="text-green-700 text-sm font-semibold">{scheme.benefitINR}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${categoryColor[scheme.category]}`}>
                      {scheme.category}
                    </span>
                    {expandedScheme === scheme.id ?
                      <ChevronUp size={16} className="text-gray-400" /> :
                      <ChevronDown size={16} className="text-gray-400" />
                    }
                  </div>
                </div>
              </button>

              {expandedScheme === scheme.id && (
                <div className="px-4 pb-4 space-y-3 border-t border-gray-100 pt-3">
                  <p className="text-sm text-gray-700">{scheme.benefit}</p>
                  <div className="bg-gray-50 rounded-xl p-3">
                    <p className="text-xs font-semibold text-gray-500 mb-1">ELIGIBILITY</p>
                    <p className="text-sm text-gray-700">{scheme.eligibility}</p>
                  </div>
                  <div className="bg-blue-50 rounded-xl p-3">
                    <p className="text-xs font-semibold text-blue-500 mb-1">HOW TO APPLY</p>
                    <p className="text-sm text-blue-800">{scheme.howToApply}</p>
                  </div>
                  <button className="w-full py-2.5 rounded-xl font-bold text-sm text-white flex items-center justify-center gap-2 active:scale-95 transition-transform"
                    style={{ backgroundColor: scheme.color }}>
                    Apply Now <ExternalLink size={14} />
                  </button>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default IncomeDashboard;
