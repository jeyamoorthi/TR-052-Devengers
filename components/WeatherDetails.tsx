import React, { useContext } from 'react';
import { AppContext } from '../App';
import { WeatherData, Language } from '../types';
import { UI_TEXT } from '../services/knowledgeBase';
import { voiceService } from '../services/voiceService';
import { CloudRain, Sun, Cloud, Wind, Calendar, Volume2, ArrowLeft, CheckCircle } from 'lucide-react';
import WeatherCard from './WeatherCard';

interface Props {
  data: WeatherData;
}

const WeatherDetails: React.FC<Props> = ({ data }) => {
  const context = useContext(AppContext);
  if (!context) return null;
  const { language, setView } = context;
  const t = UI_TEXT[language];

  const getIcon = (condition: string, size: number) => {
    if (condition.includes('Rain')) return <CloudRain size={size} className="text-blue-500" />;
    if (condition.includes('Sunny')) return <Sun size={size} className="text-yellow-500" />;
    if (condition.includes('Wind')) return <Wind size={size} className="text-gray-500" />;
    return <Cloud size={size} className="text-gray-400" />;
  };

  const speakSummary = () => {
      const summary = `${data.weeklySummary[language]}. ${t.treatment}: ${data.weeklyAdvice[language]}`;
      voiceService.speak(summary, language);
  };

  return (
    <div className="space-y-6 animate-fade-in pb-20">
       
       {/* 1. Main Current Weather Card */}
       <WeatherCard data={data} language={language} variant="full" />

       {/* 2. Weekly Timeline */}
       <div>
           <h3 className="font-bold text-gray-800 mb-3 flex items-center gap-2">
               <Calendar size={20} className="text-green-600"/> Last 7 Days & Forecast
           </h3>
           <div className="bg-white p-4 rounded-3xl shadow-sm border border-gray-100 overflow-x-auto">
               <div className="flex gap-4 min-w-[350px]">
                   {data.forecast.map((day, idx) => (
                       <div key={idx} className={`flex flex-col items-center p-3 rounded-2xl min-w-[4.5rem] ${day.day === 'Today' ? 'bg-green-50 border border-green-200' : ''}`}>
                           <span className={`text-xs font-bold mb-1 ${day.day === 'Today' ? 'text-green-700' : 'text-gray-400'}`}>{day.day}</span>
                           <span className="text-[10px] text-gray-500 mb-2">{day.date}</span>
                           <div className="mb-2">
                               {getIcon(day.condition, 24)}
                           </div>
                           <span className="font-bold text-gray-800 text-sm">{day.temp}°</span>
                           {day.rainfall > 0 && (
                               <span className="text-[10px] text-blue-500 font-bold mt-1">{day.rainfall}mm</span>
                           )}
                       </div>
                   ))}
               </div>
           </div>
       </div>

       {/* 3. Farmer-Friendly Summary & Advice */}
       <div className="bg-white rounded-3xl shadow-lg overflow-hidden border border-blue-100">
           <div className="bg-blue-50 p-4 border-b border-blue-100 flex justify-between items-center">
               <h3 className="font-bold text-blue-900">Weekly Farming Summary</h3>
               <button onClick={speakSummary}>
                   <Volume2 className="text-blue-700" size={24} />
               </button>
           </div>
           
           <div className="p-6 space-y-6">
               {/* Summary */}
               <div>
                   <h4 className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-2">Observation</h4>
                   <p className="text-lg font-medium text-gray-800 leading-relaxed">
                       {data.weeklySummary[language]}
                   </p>
               </div>

               {/* Action */}
               <div className="bg-green-50 p-4 rounded-2xl border border-green-200">
                   <h4 className="text-green-800 font-bold flex items-center gap-2 mb-2">
                       <CheckCircle size={18} /> What you should do
                   </h4>
                   <p className="text-gray-700 leading-relaxed">
                       {data.weeklyAdvice[language]}
                   </p>
               </div>
           </div>
       </div>

    </div>
  );
};

export default WeatherDetails;