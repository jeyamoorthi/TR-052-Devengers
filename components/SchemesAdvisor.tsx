import React, { useContext, useEffect, useState } from 'react';
import { AppContext } from '../App';
import { advisoryService } from '../services/advisoryService';
import { voiceService } from '../services/voiceService';
import { UI_TEXT } from '../services/knowledgeBase';
import { Scheme } from '../types';
import { Landmark, ChevronRight, Check } from 'lucide-react';

const SchemesAdvisor: React.FC = () => {
  const context = useContext(AppContext);
  if (!context) return null;
  const { user, language } = context;
  const t = UI_TEXT[language];

  const [schemes, setSchemes] = useState<Scheme[]>([]);

  useEffect(() => {
    if (user) {
      const eligible = advisoryService.getEligibleSchemes(user);
      setSchemes(eligible);
      
      // Auto-speak summary
      setTimeout(() => {
          if (eligible.length > 0) {
            voiceService.speak(`${t.eligibleSchemes}: ${eligible.map(s => s.name[language]).join(', ')}`, language);
          }
      }, 1500);
    }
  }, [user]);

  return (
    <div className="bg-white rounded-3xl shadow-lg overflow-hidden animate-fade-in border border-blue-100">
      <div className="bg-blue-600 p-6 text-white flex justify-between items-center">
        <div>
          <h2 className="text-xl font-bold">{t.schemes}</h2>
          <p className="text-blue-100 text-sm">{schemes.length} {t.eligibleSchemes}</p>
        </div>
        <Landmark size={32} className="text-blue-200" />
      </div>

      <div className="divide-y divide-gray-100">
        {schemes.map((scheme) => (
          <div key={scheme.id} className="p-5 hover:bg-blue-50 transition-colors">
            <div className="flex justify-between items-start mb-2">
                <h3 className="font-bold text-gray-900">{scheme.name[language]}</h3>
                <div className="bg-green-100 text-green-700 p-1 rounded-full">
                    <Check size={14} strokeWidth={3} />
                </div>
            </div>
            <p className="text-gray-600 text-sm mb-2">{scheme.description[language]}</p>
            <div className="inline-block bg-blue-50 text-blue-700 text-xs px-2 py-1 rounded font-medium">
                {scheme.benefits[language]}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default SchemesAdvisor;