import React, { useContext, useEffect, useState, useRef } from 'react';
import { AppContext } from '../App';
import { SoilData } from '../types';
import { soilService } from '../services/soilService';
import { UI_TEXT } from '../services/knowledgeBase';
import { voiceService } from '../services/voiceService';
import { Layers, CheckCircle, AlertTriangle, Sprout, Briefcase, Volume2, Upload, Camera, FileText, Globe, Loader2, Award } from 'lucide-react';

const SoilHealth: React.FC = () => {
  const context = useContext(AppContext);
  if (!context) return null;
  const { user, language } = context;
  const t = UI_TEXT[language];

  const [soil, setSoil] = useState<SoilData | null>(null);
  const [insights, setInsights] = useState<any>(null);
  const [activeTab, setActiveTab] = useState<'upload' | 'govt'>('upload');
  const [analyzing, setAnalyzing] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Load initial fallback data (Satellite)
  useEffect(() => {
    if (user?.location && !soil) {
      const data = soilService.getSoilData(user.location.lat, user.location.lng);
      updateSoilData(data);
    }
  }, [user]);

  const updateSoilData = (data: SoilData) => {
    setSoil(data);
    const ins = soilService.getSoilInsights(data, language);
    setInsights(ins);
    
    // Voice Summary
    setTimeout(() => {
        const sourceText = data.source === 'LabReport' ? t.verified : t.estimated;
        const speech = `${sourceText}. ${t.soilStatus}: ${ins.status}. ${ins.summary}`;
        voiceService.speak(speech, language);
    }, 1000);
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
        const file = e.target.files[0];
        setAnalyzing(true);
        voiceService.speak(t.analyzingReport, language);
        
        try {
            const verifiedData = await soilService.analyzeUploadedReport(file);
            updateSoilData(verifiedData);
        } catch (err) {
            console.error(err);
        } finally {
            setAnalyzing(false);
        }
    }
  };

  const LevelBar = ({ label, level, color }: { label: string, level: string, color: string }) => {
    const width = level === 'High' ? '100%' : (level === 'Medium' ? '66%' : '33%');
    return (
      <div className="mb-2">
        <div className="flex justify-between text-xs mb-1">
          <span className="font-medium text-gray-700">{label}</span>
          <span className="text-gray-500 font-bold uppercase">{level === 'Low' ? t.low : (level === 'Medium' ? t.medium : t.high)}</span>
        </div>
        <div className="h-2 bg-gray-200 rounded-full overflow-hidden">
          <div className={`h-full ${color}`} style={{ width: width }}></div>
        </div>
      </div>
    );
  };

  if (!soil || !insights) return <div className="p-10 text-center text-gray-400">{t.loading}</div>;

  return (
    <div className="space-y-6 animate-fade-in">
      
      {/* Action Buttons: Upload or Govt Card */}
      <div className="grid grid-cols-2 gap-3">
          <button 
             onClick={() => setActiveTab('upload')}
             className={`p-4 rounded-2xl border-2 flex flex-col items-center justify-center gap-2 transition-all ${activeTab === 'upload' ? 'border-green-600 bg-green-50 text-green-800' : 'border-gray-100 bg-white text-gray-500'}`}
          >
              <FileText size={24} />
              <span className="text-xs font-bold">{t.uploadReport}</span>
          </button>
          <button 
             onClick={() => setActiveTab('govt')}
             className={`p-4 rounded-2xl border-2 flex flex-col items-center justify-center gap-2 transition-all ${activeTab === 'govt' ? 'border-blue-600 bg-blue-50 text-blue-800' : 'border-gray-100 bg-white text-gray-500'}`}
          >
              <Award size={24} />
              <span className="text-xs font-bold">{t.govtCard}</span>
          </button>
      </div>

      {/* Upload Logic / Govt Card Info */}
      {activeTab === 'upload' && (
          <div className="bg-white p-6 rounded-3xl shadow-sm border border-gray-100 text-center">
             {analyzing ? (
                 <div className="flex flex-col items-center py-4">
                     <Loader2 size={48} className="text-green-600 animate-spin mb-3" />
                     <p className="font-bold text-gray-700 animate-pulse">{t.analyzingReport}</p>
                 </div>
             ) : (
                 <>
                    {soil.source === 'LabReport' ? (
                        <div className="bg-green-100 text-green-800 p-4 rounded-xl flex items-center justify-center gap-2 mb-2">
                            <CheckCircle size={20} />
                            <span className="font-bold">{t.verified}</span>
                        </div>
                    ) : (
                        <div 
                            onClick={() => fileInputRef.current?.click()}
                            className="border-2 border-dashed border-green-300 rounded-xl p-8 bg-green-50 flex flex-col items-center cursor-pointer hover:bg-green-100 transition-colors"
                        >
                            <Camera size={32} className="text-green-600 mb-2" />
                            <span className="font-bold text-gray-700">{t.takePhoto}</span>
                            <span className="text-xs text-gray-500 mt-1">PDF or Image accepted</span>
                            <input 
                                type="file" 
                                ref={fileInputRef} 
                                className="hidden" 
                                accept="image/*,.pdf"
                                onChange={handleFileUpload}
                            />
                        </div>
                    )}
                 </>
             )}
          </div>
      )}

      {activeTab === 'govt' && (
          <div className="bg-blue-50 p-6 rounded-3xl border border-blue-100">
              <div className="flex items-center gap-3 mb-4">
                  <Globe className="text-blue-600" size={28} />
                  <h3 className="font-bold text-blue-900 text-lg">{t.getFreeTest}</h3>
              </div>
              <p className="text-blue-800 text-sm leading-relaxed mb-4">
                  {t.govtShcHelp}
              </p>
              <a 
                href="https://soilhealth.dac.gov.in/" 
                target="_blank" 
                rel="noreferrer"
                className="block w-full text-center bg-blue-600 text-white py-3 rounded-xl font-bold"
              >
                  Visit Govt Portal
              </a>
          </div>
      )}

      {/* Insight 1: Soil Status Summary */}
      <div className={`rounded-3xl p-6 shadow-md border-l-8 flex justify-between items-start ${insights.isHealthy ? 'bg-green-50 border-green-500' : 'bg-orange-50 border-orange-500'}`}>
        <div>
           <div className="flex items-center gap-2 mb-1">
               <h2 className={`text-xl font-bold ${insights.isHealthy ? 'text-green-800' : 'text-orange-800'}`}>
                 {t.soilStatus}: {insights.status}
               </h2>
               {soil.source === 'LabReport' && <CheckCircle size={16} className="text-green-600" />}
           </div>
           
           <p className="text-gray-700 text-sm leading-relaxed">
               {insights.summary}
           </p>
        </div>
      </div>

      {/* Raw Data Visuals */}
      <div className="bg-white rounded-2xl p-5 shadow-sm border border-gray-100">
         <h3 className="font-bold text-gray-800 mb-3 flex items-center gap-2 justify-between">
            <span className="flex items-center gap-2"><Layers size={18} className="text-blue-500"/> {t.soilAnalysis}</span>
            <span className="text-[10px] font-bold uppercase text-gray-400 tracking-wider">
                {soil.source === 'LabReport' ? t.verified : t.estimated}
            </span>
         </h3>
         <div className="grid grid-cols-2 gap-x-6 gap-y-2">
            <LevelBar label={t.nitrogen} level={soil.nitrogen} color="bg-green-500" />
            <LevelBar label={t.phosphorus} level={soil.phosphorus} color="bg-orange-500" />
            <LevelBar label={t.potassium} level={soil.potassium} color="bg-blue-500" />
            <LevelBar label={t.organicCarbon} level={soil.organicCarbon} color="bg-amber-700" />
         </div>
         <div className="mt-3 pt-3 border-t flex justify-between text-sm">
            <span>pH: <span className="font-bold">{soil.ph}</span></span>
            <span>{t.texture}: <span className="font-bold">{soil.texture === 'Sandy' ? t.sandy : (soil.texture === 'Clay' ? t.clay : t.loamy)}</span></span>
         </div>
      </div>

      {/* Insight 3: Fertilizer Recommendations */}
      <div className="bg-white rounded-2xl shadow-md overflow-hidden border border-blue-100">
         <div className="bg-blue-50 p-4 border-b border-blue-100 flex justify-between items-center">
            <h3 className="font-bold text-blue-900 flex items-center gap-2">
                <Briefcase size={20}/> {t.fertilizerAdvice}
            </h3>
            <button onClick={() => voiceService.speak(insights.fertilizer.join('. '), language)}>
                <Volume2 className="text-blue-700" size={20}/>
            </button>
         </div>
         <div className="p-4">
            <ul className="space-y-3">
               {insights.fertilizer.map((tip: string, idx: number) => (
                   <li key={idx} className="flex items-start gap-3">
                       <div className="bg-blue-100 p-1 rounded-full text-blue-600 mt-0.5">
                           <CheckCircle size={14} />
                       </div>
                       <span className="text-gray-700 text-sm font-medium">{tip}</span>
                   </li>
               ))}
            </ul>
         </div>
      </div>

    </div>
  );
};

export default SoilHealth;