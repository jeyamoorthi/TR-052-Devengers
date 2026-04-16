import React, { useContext, useEffect, useState } from 'react';
import { AppContext } from '../App';
import { FarmRecord } from '../types';
import { farmRecordService } from '../services/farmRecordService';
import { UI_TEXT } from '../services/knowledgeBase';
import { voiceService } from '../services/voiceService';
import { BookOpen, AlertTriangle, CheckCircle, TrendingUp, TrendingDown, BrainCircuit } from 'lucide-react';

const FarmHistory: React.FC = () => {
  const context = useContext(AppContext);
  if (!context) return null;
  const { user, language } = context;
  const t = UI_TEXT[language];

  const [history, setHistory] = useState<FarmRecord[]>([]);
  const [insight, setInsight] = useState<{warning: boolean, messageKey: string} | null>(null);

  useEffect(() => {
    const records = farmRecordService.getHistory();
    setHistory(records);

    if (user?.primaryCrop) {
        const ai = farmRecordService.getAIInsight(user.primaryCrop);
        setInsight(ai);
        
        // Auto-voice for AI insight
        if (ai) {
            setTimeout(() => {
                voiceService.speak(`${t.aiInsight}. ${t.historyWarning} ${t.preventiveAction}`, language);
            }, 1000);
        }
    }
  }, [user]);

  return (
    <div className="space-y-6 animate-fade-in">
      
      {/* Header */}
      <div className="flex items-center gap-3 mb-2">
         <BookOpen className="text-green-700" size={28} />
         <h2 className="text-2xl font-bold text-gray-800">{t.farmHistory}</h2>
      </div>

      {/* AI Insight Card (The "Learning" Feature) */}
      {insight && (
        <div className="bg-amber-50 border-l-8 border-amber-500 rounded-2xl p-6 shadow-md">
            <div className="flex justify-between items-start">
                <div>
                    <h3 className="text-amber-900 font-bold flex items-center gap-2 mb-2">
                        <BrainCircuit size={20}/> {t.aiInsight}
                    </h3>
                    <p className="text-amber-800 font-medium">
                        {t.historyWarning} <br/>
                        <span className="text-sm font-normal text-amber-900 mt-1 block">{t.preventiveAction}</span>
                    </p>
                </div>
                <AlertTriangle className="text-amber-600" size={32} />
            </div>
        </div>
      )}

      {/* Timeline of Records */}
      <div className="space-y-4">
         <h3 className="font-bold text-gray-500 uppercase text-xs tracking-wider">{t.pastRecords}</h3>
         
         {history.map((record) => (
             <div key={record.id} className="bg-white p-5 rounded-2xl shadow-sm border border-gray-100 flex justify-between items-center">
                 <div>
                     <div className="text-xs font-bold text-gray-400 uppercase mb-1">{record.season}</div>
                     <h4 className="font-bold text-lg text-gray-800">{record.crop}</h4>
                     
                     {record.issue ? (
                         <div className="flex items-center gap-1 text-red-600 text-sm mt-1">
                             <AlertTriangle size={14} /> {record.issue}
                         </div>
                     ) : (
                         <div className="flex items-center gap-1 text-green-600 text-sm mt-1">
                             <CheckCircle size={14} /> Good Harvest
                         </div>
                     )}
                 </div>

                 <div className="text-right">
                     <div className={`font-bold ${record.profit === 'High' ? 'text-green-600' : (record.profit === 'Loss' ? 'text-red-600' : 'text-orange-600')}`}>
                         {record.profit === 'High' && <TrendingUp size={20} className="inline mb-1"/>}
                         {record.profit === 'Loss' && <TrendingDown size={20} className="inline mb-1"/>}
                         <div className="text-sm">{record.profit === 'Loss' ? t.loss : t.profit}</div>
                     </div>
                     <div className="text-xs text-gray-400 mt-1">Yield: {record.yield}</div>
                 </div>
             </div>
         ))}
      </div>
    </div>
  );
};

export default FarmHistory;