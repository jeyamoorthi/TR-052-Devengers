import React, { useContext, useEffect, useState } from 'react';
import { AppContext } from '../App';
import { SoilData, WeatherData, CropRecommendation } from '../types';
import { soilService } from '../services/soilService';
import { weatherService } from '../services/weatherService';
import { cropService } from '../services/cropService';
import { UI_TEXT } from '../services/knowledgeBase';
import { voiceService } from '../services/voiceService';
import { Sprout, Check } from 'lucide-react';

const TopCrop: React.FC = () => {
  const context = useContext(AppContext);
  if (!context) return null;
  const { user, language } = context;
  const t = UI_TEXT[language];

  const [recommendation, setRecommendation] = useState<CropRecommendation | null>(null);

  useEffect(() => {
    if (user?.location) {
      const soil = soilService.getSoilData(user.location.lat, user.location.lng);
      const weather = weatherService.getWeather(user.location.lat, user.location.lng);
      const rec = cropService.getTopCrop(soil, weather);
      setRecommendation(rec);

      // Speak recommendation
      setTimeout(() => {
         const crop = rec.cropName[language];
         voiceService.speak(`${t.recommendation}: ${crop}. ${rec.reasons[language].join(' ')}`, language);
      }, 1000);
    }
  }, [user]);

  if (!recommendation) return <div className="p-10 text-center">{t.loading}</div>;

  return (
    <div className="bg-white rounded-3xl shadow-lg overflow-hidden animate-fade-in border border-green-100">
      <div className="relative h-48">
        <img 
            src={recommendation.image} 
            alt="Crop" 
            className="w-full h-full object-cover"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-black/80 to-transparent flex items-end p-6">
            <div>
                <span className="text-green-300 text-sm font-bold uppercase tracking-wider mb-1 flex items-center gap-1">
                   <Sprout size={14} /> {t.recommendation}
                </span>
                <h2 className="text-3xl font-bold text-white">{recommendation.cropName[language]}</h2>
            </div>
        </div>
      </div>

      <div className="p-6">
        <div className="flex items-center gap-3 mb-6">
            <div className="flex-1 bg-green-50 h-2 rounded-full overflow-hidden">
                <div className="bg-green-600 h-full" style={{width: `${recommendation.suitabilityScore}%`}}></div>
            </div>
            <span className="font-bold text-green-700">{recommendation.suitabilityScore}% Match</span>
        </div>

        <h3 className="font-bold text-gray-800 mb-3">{t.whyThisCrop}</h3>
        <ul className="space-y-3">
            {recommendation.reasons[language].map((reason, idx) => (
                <li key={idx} className="flex items-start gap-3">
                    <div className="bg-green-100 p-1 rounded-full text-green-700 mt-0.5">
                        <Check size={12} strokeWidth={3} />
                    </div>
                    <span className="text-gray-700 text-sm">{reason}</span>
                </li>
            ))}
        </ul>
      </div>
    </div>
  );
};

export default TopCrop;