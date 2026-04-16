import React, { useContext, useEffect, useState } from 'react';
import { AppContext } from '../App';
import { CropStage } from '../types';
import { cropGrowthService } from '../services/cropGrowthService';
import { weatherService } from '../services/weatherService';
import { soilService } from '../services/soilService';
import { UI_TEXT } from '../services/knowledgeBase';
import { voiceService } from '../services/voiceService';
import { Sprout, AlertTriangle, Briefcase, DollarSign, Volume2, CheckCircle } from 'lucide-react';

const CropGrowth: React.FC = () => {
  const context = useContext(AppContext);
  if (!context) return null;
  const { user, language } = context;
  const t = UI_TEXT[language];

  const [stage, setStage] = useState<CropStage>('Vegetative');
  const [age, setAge] = useState(0);
  const [advice, setAdvice] = useState<any>(null);
  const [risk, setRisk] = useState<any>(null);

  useEffect(() => {
    if (user?.sowingDate && user.location) {
        // Calculate Age & Stage
        const cropAge = cropGrowthService.getCropAge(user.sowingDate);
        setAge(cropAge);
        const currentStage = cropGrowthService.getStage(cropAge);
        setStage(currentStage);

        // Get Context Data
        const weather = weatherService.getWeather(user.location.lat, user.location.lng);
        const soil = soilService.getSoilData(user.location.lat, user.location.lng);

        // Generate Insights
        const adv = cropGrowthService.getAdvice(currentStage, weather, soil, language);
        const rsk = cropGrowthService.getRisk(weather, cropAge);

        setAdvice(adv);
        setRisk(rsk);

        // Auto-voice
        setTimeout(() => {
            const speech = `${t.currentStage} ${t.is} ${currentStage}. ${adv.fertilizer}`;
            voiceService.speak(speech, language);
        }, 1000);
    }
  }, [user]);

  if (!advice || !risk) return <div className="p-10 text-center">{t.loading}</div>;

  const stages: CropStage[] = ['Seedling', 'Vegetative', 'Flowering', 'Fruiting', 'Harvest'];
  const currentStageIndex = stages.indexOf(stage);

  return (
    <div className="space-y-6 animate-fade-in">
        
      {/* Header Card */}
      <div className="bg-white p-6 rounded-3xl shadow-md border border-green-100 flex items-center justify-between">
         <div>
             <h2 className="text-gray-500 text-sm font-bold uppercase tracking-wider">{t.currentStage}</h2>
             <h1 className="text-3xl font-bold text-green-700 mt-1">{t[stage.toLowerCase() as keyof typeof t] || stage}</h1>
             <p className="text-gray-600 font-medium mt-1">{t.cropAge}: {age} {t.days}</p>
         </div>
         <div className="bg-green-100 p-4 rounded-full text-green-700">
             <Sprout size={32} />
         </div>
      </div>

      {/* Progress Bar */}
      <div className="bg-white p-4 rounded-2xl shadow-sm overflow-x-auto">
          <div className="flex items-center justify-between min-w-[300px]">
              {stages.map((s, i) => (
                  <div key={s} className="flex flex-col items-center">
                      <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold mb-2 transition-colors ${i <= currentStageIndex ? 'bg-green-600 text-white' : 'bg-gray-200 text-gray-500'}`}>
                          {i + 1}
                      </div>
                      <span className={`text-[10px] font-bold ${i === currentStageIndex ? 'text-green-700' : 'text-gray-400'}`}>
                          {t[s.toLowerCase() as keyof typeof t] || s}
                      </span>
                  </div>
              ))}
          </div>
          <div className="relative h-2 bg-gray-100 rounded-full mt-2 mx-4">
              <div 
                className="absolute top-0 left-0 h-full bg-green-500 rounded-full transition-all duration-1000"
                style={{ width: `${(currentStageIndex / (stages.length - 1)) * 100}%` }}
              ></div>
          </div>
      </div>

      {/* Fertilizer Advisor */}
      <div className="bg-white rounded-2xl shadow-md overflow-hidden border border-blue-100">
         <div className="bg-blue-50 p-4 border-b border-blue-100 flex justify-between items-center">
            <h3 className="font-bold text-blue-900 flex items-center gap-2">
                <Briefcase size={20}/> {t.fertilizerAdvice}
            </h3>
            <button onClick={() => voiceService.speak(advice.fertilizer, language)}>
                <Volume2 className="text-blue-700" size={20}/>
            </button>
         </div>
         <div className="p-5">
             <p className="text-gray-800 font-medium leading-relaxed flex items-start gap-3">
                <CheckCircle className="text-blue-500 shrink-0 mt-1" size={18} />
                {advice.fertilizer}
             </p>
         </div>
      </div>

      {/* Risk & Health */}
      <div className={`rounded-2xl shadow-md p-5 border-l-8 ${risk.level === 'Low' ? 'bg-green-50 border-green-500' : (risk.level === 'Medium' ? 'bg-yellow-50 border-yellow-500' : 'bg-red-50 border-red-500')}`}>
          <div className="flex justify-between items-start">
              <div>
                  <h3 className={`font-bold text-lg ${risk.level === 'Low' ? 'text-green-800' : (risk.level === 'Medium' ? 'text-yellow-800' : 'text-red-800')}`}>
                      {t.risk}: {risk.level}
                  </h3>
                  <p className="text-gray-700 mt-1">{risk.reason}</p>
              </div>
              <AlertTriangle className={risk.level === 'Low' ? 'text-green-600' : (risk.level === 'Medium' ? 'text-yellow-600' : 'text-red-600')} size={28} />
          </div>
      </div>

      {/* Financial Advice */}
      <div className="bg-white rounded-2xl shadow-md overflow-hidden border border-purple-100">
         <div className="bg-purple-50 p-4 border-b border-purple-100 flex justify-between items-center">
            <h3 className="font-bold text-purple-900 flex items-center gap-2">
                <DollarSign size={20}/> {t.financialAdvice}
            </h3>
            <button onClick={() => voiceService.speak(advice.financial, language)}>
                <Volume2 className="text-purple-700" size={20}/>
            </button>
         </div>
         <div className="p-5">
             <h4 className="text-2xl font-bold text-purple-700 mb-2">₹{advice.investedAmount} <span className="text-sm font-normal text-gray-500">{t.invested}</span></h4>
             <p className="text-gray-700 text-sm leading-relaxed">
                {advice.financial}
             </p>
         </div>
      </div>

    </div>
  );
};

export default CropGrowth;