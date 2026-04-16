import React, { useContext, useState } from 'react';
import { AppContext } from '../App';
import { WeatherData, YieldPrediction } from '../types';
import { UI_TEXT } from '../services/knowledgeBase';
import { TrendingUp, TrendingDown, Info } from 'lucide-react';

interface Props {
  weatherData: WeatherData;
}

const YieldCalculator: React.FC<Props> = ({ weatherData }) => {
  const context = useContext(AppContext);
  if (!context) return null;
  const { user, language } = context;
  const t = UI_TEXT[language];

  const [prediction, setPrediction] = useState<YieldPrediction | null>(null);

  const calculate = () => {
    // Rule Engine Logic
    // Base yield for typical crops (simplified units per acre)
    let baseYield = 2000; // kg/acre default
    if (user?.primaryCrop.toLowerCase().includes('rice')) baseYield = 2500;
    if (user?.primaryCrop.toLowerCase().includes('wheat')) baseYield = 1800;

    // Factors
    const factors: YieldPrediction['factors'] = [];
    
    // 1. Weather Factor
    if (weatherData.alerts.length > 0) {
        baseYield *= 0.85; // Reduce by 15% due to alerts
        factors.push({
            factor: 'Weather Alerts',
            impact: 'Negative',
            description: 'Active weather alerts suggest stress conditions.'
        });
    } else {
        baseYield *= 1.05;
        factors.push({
            factor: 'Good Weather',
            impact: 'Positive',
            description: 'Stable temperature and humidity favor growth.'
        });
    }

    // 2. Disease Factor (Simulate checking community reports)
    const storedReports = localStorage.getItem('smartagri_reports');
    const reports = storedReports ? JSON.parse(storedReports) : [];
    if (reports.length > 2) {
        baseYield *= 0.7; // Significant drop
        factors.push({
            factor: 'Disease Outbreak',
            impact: 'Negative',
            description: 'High disease pressure detected in local community.'
        });
    }

    // Calculate final range
    const low = Math.floor(baseYield * 0.9);
    const high = Math.floor(baseYield * 1.1);

    setPrediction({
        yieldAmount: `${low} - ${high} kg/acre`,
        riskLevel: factors.some(f => f.impact === 'Negative') ? 'Medium' : 'Low',
        factors
    });
  };

  return (
    <div className="space-y-6">
       <div className="bg-white p-6 rounded-2xl shadow-md">
           <h3 className="font-bold text-gray-800 mb-4">{t.yield}</h3>
           <div className="flex gap-4 mb-6">
                <div className="bg-gray-100 p-3 rounded-xl flex-1">
                    <span className="text-xs text-gray-500 block">{t.crop}</span>
                    <span className="font-bold">{user?.primaryCrop}</span>
                </div>
                <div className="bg-gray-100 p-3 rounded-xl flex-1">
                    <span className="text-xs text-gray-500 block">{t.acres}</span>
                    <span className="font-bold">{user?.farmSizeAcres}</span>
                </div>
           </div>
           
           <button 
             onClick={calculate}
             className="w-full bg-yellow-500 hover:bg-yellow-600 text-white font-bold py-3 rounded-xl shadow transition-all"
           >
             {t.yieldCalc}
           </button>
       </div>

       {prediction && (
           <div className="bg-white p-6 rounded-2xl shadow-lg border-t-4 border-yellow-500 animate-fade-in">
               <div className="text-center mb-6">
                   <p className="text-sm text-gray-500">Estimated Yield</p>
                   <h2 className="text-3xl font-bold text-gray-900">{prediction.yieldAmount}</h2>
                   <span className={`inline-block px-3 py-1 rounded-full text-xs font-bold mt-2 ${prediction.riskLevel === 'Low' ? 'bg-green-100 text-green-700' : 'bg-orange-100 text-orange-700'}`}>
                       {prediction.riskLevel} Risk
                   </span>
               </div>

               <h4 className="font-bold text-gray-800 mb-3">{t.factors}</h4>
               <div className="space-y-3">
                   {prediction.factors.map((f, i) => (
                       <div key={i} className="flex items-start gap-3 bg-gray-50 p-3 rounded-xl">
                           {f.impact === 'Positive' 
                             ? <TrendingUp className="text-green-500 shrink-0" /> 
                             : <TrendingDown className="text-red-500 shrink-0" />
                           }
                           <div>
                               <p className="font-bold text-sm">{f.factor}</p>
                               <p className="text-xs text-gray-600">{f.description}</p>
                           </div>
                       </div>
                   ))}
               </div>
           </div>
       )}
    </div>
  );
};

export default YieldCalculator;