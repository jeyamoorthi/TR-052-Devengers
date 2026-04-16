import React, { useContext, useEffect, useState } from 'react';
import { AppContext } from '../App';
import { advisoryService } from '../services/advisoryService';
import { weatherService } from '../services/weatherService';
import { voiceService } from '../services/voiceService';
import { UI_TEXT } from '../services/knowledgeBase';
import { InputAdvisory } from '../types';
import { Droplets, Wind, CheckCircle, AlertTriangle, XCircle } from 'lucide-react';

const InputAdvisor: React.FC = () => {
  const context = useContext(AppContext);
  if (!context) return null;
  const { user, language } = context;
  const t = UI_TEXT[language];

  const [advisory, setAdvisory] = useState<InputAdvisory | null>(null);

  useEffect(() => {
    if (user?.location) {
      const weather = weatherService.getWeather(user.location.lat, user.location.lng);
      const advice = advisoryService.getInputAdvisory(weather, language);
      setAdvisory(advice);

      // Auto-speak advice
      setTimeout(() => {
          voiceService.speak(`${advice.title[language]}. ${advice.message[language]}`, language);
      }, 1000);
    }
  }, [user]);

  if (!advisory) return null;

  const getColor = () => {
      if (advisory.action === 'danger') return 'bg-red-50 border-red-200 text-red-900';
      if (advisory.action === 'warning') return 'bg-yellow-50 border-yellow-200 text-yellow-900';
      return 'bg-green-50 border-green-200 text-green-900';
  };

  const getIcon = () => {
      if (advisory.icon === 'droplet') return <Droplets size={32} className="text-blue-500" />;
      if (advisory.icon === 'wind') return <Wind size={32} className="text-gray-500" />;
      return <CheckCircle size={32} className="text-green-500" />;
  };

  return (
    <div className={`rounded-3xl shadow-lg overflow-hidden animate-fade-in border-2 ${getColor()} p-6`}>
        <div className="flex items-center gap-4">
            <div className="bg-white p-3 rounded-full shadow-sm">
                {getIcon()}
            </div>
            <div>
                <h3 className="font-bold text-xl mb-1">{t.inputAdvisor}</h3>
                <h4 className="font-bold text-lg leading-tight">{advisory.title[language]}</h4>
            </div>
        </div>
        <div className="mt-4 pt-4 border-t border-black/5">
            <p className="font-medium text-lg">{advisory.message[language]}</p>
        </div>
    </div>
  );
};

export default InputAdvisor;