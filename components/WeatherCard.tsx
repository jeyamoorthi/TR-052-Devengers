import React, { useEffect, useRef } from 'react';
import { WeatherData, Language } from '../types';
import { UI_TEXT } from '../services/knowledgeBase';
import { voiceService } from '../services/voiceService';
import { CloudRain, Sun, Cloud, AlertOctagon, Droplets, Wind } from 'lucide-react';

interface Props {
  data: WeatherData;
  language: Language;
  variant?: 'banner' | 'full';
}

const WeatherCard: React.FC<Props> = ({ data, language, variant = 'full' }) => {
  const t = UI_TEXT[language];
  const hasSpoken = useRef(false);

  const getIcon = (condition: string, size: number, className: string) => {
    if (condition.includes('Rain')) return <CloudRain size={size} className={className} />;
    if (condition.includes('Sunny')) return <Sun size={size} className={className} />;
    if (condition.includes('Wind')) return <Wind size={size} className={className} />;
    return <Cloud size={size} className={className} />;
  };

  const getBackgroundUrl = (condition: string) => {
      if (condition.includes('Rain')) return 'https://images.unsplash.com/photo-1515694346937-94d85e41e6f0?auto=format&fit=crop&q=80&w=1000';
      if (condition.includes('Sunny')) return 'https://images.unsplash.com/photo-1504386106331-3e4e71712b38?auto=format&fit=crop&q=80&w=1000';
      if (condition.includes('Wind')) return 'https://images.unsplash.com/photo-1469474968028-56623f02e42e?auto=format&fit=crop&q=80&w=1000';
      return 'https://images.unsplash.com/photo-1534088568595-a066f410bcda?auto=format&fit=crop&q=80&w=1000'; // Cloudy default
  };

  useEffect(() => {
    // Automatic Voice Summary on Mount (Once per session/mount)
    if (variant === 'banner' && !hasSpoken.current && !sessionStorage.getItem('weather_spoken')) {
        const warning = data.alerts.length > 0 ? `${t.alert}: ${data.alerts[0].message[language]}` : '';
        const summary = `${t.weather}. Today is ${data.condition}. ${warning}`;
        
        // Slight delay to allow app load
        setTimeout(() => {
            voiceService.speak(summary, language);
            sessionStorage.setItem('weather_spoken', 'true');
        }, 1500);
        
        hasSpoken.current = true;
    }
  }, [data, language, variant]);

  if (variant === 'banner') {
    return (
      <div className="relative w-full h-44 rounded-3xl overflow-hidden shadow-lg border-2 border-white group">
        {/* Background Image */}
        <img 
          src={getBackgroundUrl(data.condition)} 
          alt="Weather Background" 
          className="absolute inset-0 w-full h-full object-cover brightness-75 transition-transform duration-700 group-hover:scale-105"
        />
        
        <div className="absolute inset-0 p-6 flex flex-col justify-between text-white bg-gradient-to-r from-black/50 to-transparent">
          <div className="flex justify-between items-start">
            <div>
                <div className="flex items-center gap-2 mb-1">
                   {getIcon(data.condition, 24, "text-yellow-300")}
                   <span className="font-bold text-lg drop-shadow-md">{data.condition}</span>
                </div>
                <h2 className="text-5xl font-extrabold drop-shadow-md">{data.temp}°C</h2>
            </div>
            
            {/* Warning Badge */}
            {data.alerts.length > 0 && (
               <div className="bg-red-600/90 backdrop-blur-sm px-3 py-2 rounded-xl text-xs font-bold animate-pulse flex items-center gap-2 shadow-sm border border-red-400">
                 <AlertOctagon size={16} />
                 <span>{data.alerts[0].type} Risk</span>
               </div>
            )}
          </div>
          
          <div className="flex items-center gap-6 text-sm font-medium backdrop-blur-sm bg-black/20 p-2 rounded-xl w-fit">
               <div className="flex items-center gap-1">
                 <Droplets size={16} className="text-blue-300" />
                 <span>{data.humidity}% Humidity</span>
               </div>
               <div className="flex items-center gap-1">
                 <Wind size={16} className="text-gray-300" />
                 <span>{data.windSpeed} km/h</span>
               </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Main Stats */}
      <div className="bg-white rounded-2xl shadow-md p-6 flex justify-between items-center border border-gray-100">
        <div>
          <p className="text-gray-500 text-sm mb-1 font-bold uppercase tracking-wider">{t.weather}</p>
          <h2 className="text-5xl font-extrabold text-gray-800">{data.temp}°C</h2>
          <p className="text-lg text-gray-600 font-medium mt-1">{data.condition}</p>
        </div>
        <div className="flex flex-col items-end gap-3">
            {getIcon(data.condition, 48, data.condition.includes('Rain') ? "text-blue-500" : (data.condition.includes('Sunny') ? "text-yellow-500" : "text-gray-500"))}
            <div className="flex items-center gap-1 text-blue-700 bg-blue-50 px-3 py-1 rounded-lg border border-blue-100">
                <Droplets size={16} />
                <span className="font-bold">{data.humidity}%</span>
            </div>
        </div>
      </div>

      {/* Alerts */}
      {data.alerts.length > 0 ? (
        <div className="space-y-3">
          {data.alerts.map((alert, idx) => (
            <div key={idx} className={`p-5 rounded-2xl border-l-4 shadow-sm ${alert.severity === 'High' ? 'bg-red-50 border-red-500' : 'bg-yellow-50 border-yellow-500'}`}>
               <div className="flex items-start gap-3">
                   <AlertOctagon className={alert.severity === 'High' ? 'text-red-600' : 'text-yellow-600'} size={24} />
                   <div>
                       <h4 className={`font-bold uppercase text-xs mb-1 ${alert.severity === 'High' ? 'text-red-600' : 'text-yellow-600'}`}>
                           {alert.type} {t.alert}
                       </h4>
                       <p className="font-bold text-gray-900 mb-2 leading-tight">{alert.message[language]}</p>
                       <div className="bg-white/80 p-3 rounded-xl text-sm text-gray-800 border border-gray-200">
                           <span className="font-bold block text-gray-500 text-xs uppercase mb-1">Action Required</span> 
                           {alert.action[language]}
                       </div>
                   </div>
               </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="bg-green-50 p-6 rounded-2xl border border-green-200 text-center">
            <h3 className="text-green-700 font-bold flex items-center justify-center gap-2">
                <Sun size={20}/> No Critical Alerts
            </h3>
            <p className="text-green-600 text-sm mt-1">Conditions are favorable for farming.</p>
        </div>
      )}
    </div>
  );
};

export default WeatherCard;