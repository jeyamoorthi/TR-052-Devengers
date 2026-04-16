import React, { useState, useContext, useRef } from 'react';
import { AppContext } from '../App';
import { DISEASES, UI_TEXT } from '../services/knowledgeBase';
import { voiceService } from '../services/voiceService';
import { geminiService } from '../services/geminiService';
import { Camera, Upload, CheckCircle, AlertTriangle, Volume2 } from 'lucide-react';

const DiseaseDetector: React.FC = () => {
  const context = useContext(AppContext);
  if (!context) return null;
  const { language } = context;
  const t = UI_TEXT[language];

  const [image, setImage] = useState<string | null>(null);
  const [analyzing, setAnalyzing] = useState(false);
  const [resultId, setResultId] = useState<string | null>(null);
  const [confirmed, setConfirmed] = useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null);

  // Deterministic "Model" Logic
  // In real app: TFLite model inference on canvas data
  // Here: We hash the file size to pick a disease from KB deterministically
  const runModelSimulation = (file: File) => {
    setAnalyzing(true);
    voiceService.speak(t.analyzing, language);
    
    setTimeout(() => {
      const size = file.size;
      const keys = Object.keys(DISEASES);
      // Simple hash to pick a disease
      const index = size % keys.length; 
      const diseaseId = keys[index];
      
      setResultId(diseaseId);
      setAnalyzing(false);
      
      // Auto-speak the result name
      const name = DISEASES[diseaseId].name[language];
      voiceService.speak(`${t.alert}. ${name} detected.`, language);

    }, 2500); // Simulate processing delay
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      setImage(URL.createObjectURL(file));
      setResultId(null);
      setConfirmed(false);
      runModelSimulation(file);
    }
  };

  const handleShare = () => {
    // In real app: POST to backend
    // Here: LocalStorage simulation for Community component to read
    const report = {
      id: Date.now().toString(),
      diseaseId: resultId,
      timestamp: Date.now(),
      location: context.user?.location,
      confirmed: true
    };
    
    const existing = JSON.parse(localStorage.getItem('smartagri_reports') || '[]');
    localStorage.setItem('smartagri_reports', JSON.stringify([report, ...existing]));
    
    setConfirmed(true);
    voiceService.speak(t.shared, language);
  };

  const currentDisease = resultId ? DISEASES[resultId] : null;

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Input Section */}
      <div className="bg-white rounded-2xl shadow-md p-6 text-center">
        {!image ? (
          <div 
            onClick={() => fileInputRef.current?.click()}
            className="border-2 border-dashed border-green-300 rounded-xl p-10 bg-green-50 flex flex-col items-center justify-center cursor-pointer hover:bg-green-100 transition-colors"
          >
            <Camera size={48} className="text-green-600 mb-4" />
            <span className="font-bold text-gray-700">{t.takePhoto}</span>
            <input 
              type="file" 
              ref={fileInputRef} 
              className="hidden" 
              accept="image/*"
              onChange={handleFileChange}
            />
          </div>
        ) : (
          <div className="relative">
            <img src={image} alt="Leaf" className="rounded-xl w-full h-64 object-cover" />
            <button 
              onClick={() => { setImage(null); setResultId(null); }}
              className="absolute top-2 right-2 bg-black/60 text-white p-2 rounded-full"
            >
              x
            </button>
          </div>
        )}
      </div>

      {/* Analysis Status */}
      {analyzing && (
        <div className="bg-white p-6 rounded-2xl shadow flex flex-col items-center">
            <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-green-600 mb-4"></div>
            <p className="text-lg font-medium animate-pulse">{t.analyzing}</p>
        </div>
      )}

      {/* Results Section */}
      {currentDisease && !analyzing && (
        <div className="bg-white rounded-2xl shadow-lg overflow-hidden border border-red-100">
          <div className="bg-red-50 p-4 border-b border-red-100 flex justify-between items-center">
            <div className="flex items-center gap-2 text-red-700">
                <AlertTriangle />
                <h3 className="font-bold text-lg">{currentDisease.name[language]}</h3>
            </div>
            <button onClick={() => voiceService.speak(currentDisease.description[language], language)}>
                <Volume2 className="text-red-700" />
            </button>
          </div>
          
          <div className="p-6 space-y-4">
            <p className="text-gray-700 leading-relaxed">
              {currentDisease.description[language]}
            </p>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="bg-green-50 p-4 rounded-xl">
                    <h4 className="font-bold text-green-800 mb-2 flex items-center gap-2"><CheckCircle size={16}/> {t.do}</h4>
                    <ul className="list-disc list-inside text-sm text-green-900 space-y-1">
                        {currentDisease.treatment.do[language].map((step, i) => (
                            <li key={i}>{step}</li>
                        ))}
                    </ul>
                </div>
                <div className="bg-red-50 p-4 rounded-xl">
                    <h4 className="font-bold text-red-800 mb-2 flex items-center gap-2"><AlertTriangle size={16}/> {t.dont}</h4>
                    <ul className="list-disc list-inside text-sm text-red-900 space-y-1">
                        {currentDisease.treatment.dont[language].map((step, i) => (
                            <li key={i}>{step}</li>
                        ))}
                    </ul>
                </div>
            </div>

            {/* Community Confirmation */}
            <div className="mt-4 pt-4 border-t">
              {!confirmed ? (
                <button 
                  onClick={handleShare}
                  className="w-full bg-red-600 text-white py-3 rounded-xl font-bold hover:bg-red-700"
                >
                  {t.confirm} & {t.share}
                </button>
              ) : (
                <div className="bg-green-100 text-green-800 p-3 rounded-xl text-center font-medium">
                  {t.shared}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default DiseaseDetector;