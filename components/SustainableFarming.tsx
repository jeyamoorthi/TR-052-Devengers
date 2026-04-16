import React, { useContext, useEffect } from 'react';
import { AppContext } from '../App';
import { UI_TEXT } from '../services/knowledgeBase';
import { voiceService } from '../services/voiceService';
import { HeartHandshake, Leaf, Droplets, Recycle, Sun } from 'lucide-react';

const SustainableFarming: React.FC = () => {
  const context = useContext(AppContext);
  if (!context) return null;
  const { user, language } = context;
  const t = UI_TEXT[language];

  // Static advice based on user profile logic could be expanded here
  // For now, we present universal sustainable practices tailored to the crop/soil context conceptually.

  useEffect(() => {
    // Auto-voice introduction
    setTimeout(() => {
        voiceService.speak(`${t.sustainable}. ${t.mulching}, ${t.cropRotation}, ${t.waterMgmt}.`, language);
    }, 1000);
  }, []);

  const AdviceCard = ({ title, icon: Icon, color, text }: any) => (
      <div className={`bg-white p-5 rounded-2xl shadow-sm border border-gray-100 flex gap-4 ${color}`}>
          <div className="shrink-0">
              <div className="w-12 h-12 rounded-full bg-white/50 flex items-center justify-center shadow-sm">
                  <Icon size={24} className="text-gray-700"/>
              </div>
          </div>
          <div>
              <h3 className="font-bold text-gray-800 text-lg mb-1">{title}</h3>
              <p className="text-gray-600 text-sm leading-relaxed">{text}</p>
          </div>
      </div>
  );

  return (
    <div className="space-y-6 animate-fade-in pb-20">
      
      {/* Header */}
      <div className="bg-green-600 text-white p-6 rounded-3xl shadow-lg relative overflow-hidden">
          <div className="relative z-10">
              <h2 className="text-2xl font-bold flex items-center gap-2 mb-2">
                  <HeartHandshake /> {t.sustainable}
              </h2>
              <p className="opacity-90 text-sm max-w-[80%]">
                  Practices to improve soil health and long-term yield for {user?.primaryCrop}.
              </p>
          </div>
          <Leaf className="absolute -bottom-4 -right-4 text-green-500 opacity-50" size={120} />
      </div>

      <div className="space-y-4">
          <AdviceCard 
            title={t.mulching} 
            icon={LayersIcon}
            color="bg-amber-50"
            text="Cover soil with crop residue or plastic mulch to retain moisture, suppress weeds, and improve soil organic carbon."
          />
          <AdviceCard 
            title={t.cropRotation} 
            icon={Recycle}
            color="bg-blue-50"
            text={`Rotate ${user?.primaryCrop} with legumes or pulses next season to fix nitrogen naturally in the soil.`}
          />
          <AdviceCard 
            title={t.waterMgmt} 
            icon={Droplets}
            color="bg-cyan-50"
            text="Use drip irrigation or schedule watering during early morning/evening to reduce evaporation loss."
          />
          <AdviceCard 
            title="Solar Integration" 
            icon={Sun}
            color="bg-yellow-50"
            text="Consider solar pumps for irrigation to reduce electricity costs and carbon footprint."
          />
      </div>

      {/* Soil Context Tip */}
      <div className="bg-green-50 p-5 rounded-2xl border border-green-200">
          <h4 className="font-bold text-green-800 mb-2">My Soil Context ({user?.soilType})</h4>
          <p className="text-sm text-green-900">
              {user?.soilType === 'Clay' && "Clay soil holds water well but needs drainage. Add organic compost to improve aeration."}
              {user?.soilType === 'Sandy' && "Sandy soil drains fast. Add manure/mulch to increase water holding capacity."}
              {user?.soilType === 'Loamy' && "Loamy soil is ideal. Maintain health with regular organic inputs."}
              {!user?.soilType && "Test your soil to get specific sustainability advice."}
          </p>
      </div>
    </div>
  );
};

// Local Icon wrapper for visual consistency
const LayersIcon = (props: any) => (
    <svg {...props} xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 2L2 7l10 5 10-5-10-5z"/><path d="M2 17l10 5 10-5"/><path d="M2 12l10 5 10-5"/></svg>
);

export default SustainableFarming;
