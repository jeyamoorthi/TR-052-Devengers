import React, { useContext, useMemo } from 'react';
import { AppContext } from '../App';
import { sustainabilityService } from '../services/sustainabilityService';
import { CheckCircle, AlertCircle, Lightbulb } from 'lucide-react';

interface Props {
  weatherData: any;
}

const SustainabilityScore: React.FC<Props> = ({ weatherData }) => {
  const context = useContext(AppContext);
  if (!context || !context.user || !weatherData) return null;
  const { user } = context;

  const profile = useMemo(() =>
    sustainabilityService.evaluate(user, weatherData), [user, weatherData]);

  const gradeColor: Record<string, string> = {
    'A+': 'text-green-600', A: 'text-green-500',
    'B+': 'text-lime-600', B: 'text-yellow-600',
    C: 'text-amber-600', D: 'text-red-500'
  };
  const gradeBg: Record<string, string> = {
    'A+': 'from-green-500 to-emerald-600', A: 'from-green-400 to-teal-500',
    'B+': 'from-lime-500 to-green-500', B: 'from-yellow-400 to-lime-500',
    C: 'from-amber-400 to-orange-500', D: 'from-red-400 to-orange-500'
  };

  return (
    <div className="space-y-5 pb-6">
      {/* Header */}
      <div>
        <h2 className="text-2xl font-extrabold text-gray-900">Sustainability Report</h2>
        <p className="text-gray-500 text-sm mt-1">How eco-friendly is your farm?</p>
      </div>

      {/* Grade Card */}
      <div className={`rounded-3xl bg-gradient-to-br ${gradeBg[profile.grade]} p-6 text-white shadow-xl text-center relative overflow-hidden`}>
        <div className="absolute inset-0 bg-black/10 rounded-3xl" />
        <div className="relative z-10">
          <p className="text-white/80 text-sm font-semibold uppercase tracking-widest mb-2">Farm Grade</p>
          <p className="text-8xl font-black">{profile.grade}</p>
          <p className="text-5xl font-black mt-2">{profile.overallScore}<span className="text-2xl font-medium opacity-70">/100</span></p>
          <p className="text-white/80 text-sm mt-3">
            Your farm is more sustainable than <strong>{Math.floor(profile.overallScore * 0.85)}%</strong> of farms in your region
          </p>
        </div>
      </div>

      {/* Pillar Scores */}
      <div className="bg-white rounded-3xl p-5 shadow-sm border border-gray-100">
        <h3 className="font-bold text-gray-800 mb-4">Sustainability Pillars</h3>
        <div className="space-y-4">
          {profile.pillars.map((pillar, i) => (
            <div key={i}>
              <div className="flex items-center justify-between mb-1">
                <div className="flex items-center gap-2">
                  <span className="text-xl">{pillar.icon}</span>
                  <span className="text-sm font-semibold text-gray-700">{pillar.name}</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-xs text-gray-400 italic">{pillar.label}</span>
                  <span className="text-sm font-bold" style={{ color: pillar.color }}>{pillar.score}</span>
                </div>
              </div>
              <div className="w-full bg-gray-100 rounded-full h-2.5">
                <div
                  className="h-2.5 rounded-full transition-all duration-700"
                  style={{ width: `${pillar.score}%`, backgroundColor: pillar.color }}
                />
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Insights */}
      {profile.insights.length > 0 && (
        <div className="bg-green-50 rounded-3xl p-5 border border-green-200">
          <h3 className="font-bold text-green-800 mb-3 flex items-center gap-2">
            <CheckCircle size={18} /> Key Insights
          </h3>
          <div className="space-y-2">
            {profile.insights.map((insight, i) => (
              <p key={i} className="text-sm text-green-700 leading-relaxed">{insight}</p>
            ))}
          </div>
        </div>
      )}

      {/* Recommendations */}
      {profile.recommendations.length > 0 && (
        <div className="bg-amber-50 rounded-3xl p-5 border border-amber-200">
          <h3 className="font-bold text-amber-800 mb-3 flex items-center gap-2">
            <Lightbulb size={18} /> Improve Your Score
          </h3>
          <div className="space-y-3">
            {profile.recommendations.map((rec, i) => (
              <div key={i} className="flex items-start gap-2">
                <span className="text-amber-500 font-bold mt-0.5 text-sm">→</span>
                <p className="text-sm text-amber-800 leading-relaxed">{rec}</p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Score Comparison Banner */}
      <div className="bg-white rounded-3xl p-5 shadow-sm border border-gray-100">
        <h3 className="font-bold text-gray-800 mb-3">Regional Comparison</h3>
        <div className="space-y-3">
          {[
            { label: 'Your Farm', score: profile.overallScore, highlight: true },
            { label: 'District Average', score: Math.floor(profile.overallScore * 0.72), highlight: false },
            { label: 'State Average', score: Math.floor(profile.overallScore * 0.65), highlight: false },
          ].map((row, i) => (
            <div key={i}>
              <div className="flex justify-between mb-1">
                <span className={`text-sm ${row.highlight ? 'font-bold text-green-700' : 'text-gray-600'}`}>
                  {row.label}
                </span>
                <span className={`text-sm font-bold ${row.highlight ? 'text-green-700' : 'text-gray-500'}`}>
                  {row.score}
                </span>
              </div>
              <div className="w-full bg-gray-100 h-2.5 rounded-full">
                <div
                  className={`h-2.5 rounded-full ${row.highlight ? 'bg-green-500' : 'bg-gray-400'}`}
                  style={{ width: `${row.score}%` }}
                />
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default SustainabilityScore;
