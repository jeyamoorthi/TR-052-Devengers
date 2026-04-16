import React, { useContext, useEffect, useState } from 'react';
import { AppContext } from '../App';
import { Crop, CropInput, WeatherData } from '../types';
import { firebaseService } from '../services/firebaseService';
import { cropGrowthService } from '../services/cropGrowthService';
import { weatherService } from '../services/weatherService';
import { marketService } from '../services/marketService';
import { advisoryService } from '../services/advisoryService';
import { UI_TEXT } from '../services/knowledgeBase';
import { voiceService } from '../services/voiceService';
import { 
  Sprout, Droplets, IndianRupee, History, 
  Leaf, Plus, BrainCircuit, ChevronRight, CloudRain, Sun, CalendarCheck,
  Mic, MicOff, Save, X
} from 'lucide-react';

const MyCropJourney: React.FC = () => {
  const context = useContext(AppContext);
  if (!context) return null;
  const { user, language } = context;
  const t = UI_TEXT[language];

  const [mode, setMode] = useState<'live' | 'history'>('live');
  const [activeCrop, setActiveCrop] = useState<Crop | null>(null);
  const [history, setHistory] = useState<Crop[]>([]);
  const [inputs, setInputs] = useState<CropInput[]>([]);
  
  const [advice, setAdvice] = useState<any>(null);
  const [marketPrice, setMarketPrice] = useState<number | null>(null);
  const [aiWarning, setAiWarning] = useState<string | null>(null);

  // New Crop Form (Live)
  const [isAdding, setIsAdding] = useState(false);
  const [newCropData, setNewCropData] = useState({ name: 'Tomato', season: 'Kharif', acres: '1' });

  // Add History Form (Past)
  const [isAddingHistory, setIsAddingHistory] = useState(false);
  const [historyForm, setHistoryForm] = useState({
      cropName: '',
      season: 'Kharif',
      year: new Date().getFullYear().toString(),
      yieldAmount: '',
      profitability: 'Average' as 'High' | 'Average' | 'Loss'
  });
  const [activeVoiceField, setActiveVoiceField] = useState<string | null>(null);

  useEffect(() => {
    refreshData();
  }, [user]);

  const refreshData = async () => {
    if (!user) return;
    
    // 1. Fetch Active Crop from Firestore
    const current = await firebaseService.getActiveCrop(user.uid);
    setActiveCrop(current);

    // 2. Fetch History
    const past = await firebaseService.getCropHistory(user.uid);
    // Sort by date descending
    setHistory(past.sort((a, b) => b.createdAt - a.createdAt));

    if (current) {
        // 3. Fetch Inputs sub-collection
        const inp = await firebaseService.getCropInputs(current.id);
        setInputs(inp);

        // 4. Calculate Logic
        const age = cropGrowthService.getCropAge(current.sowingDate);
        const stage = cropGrowthService.getStage(age);
        
        // Mock weather/soil for advice generation
        const w = weatherService.getWeather(user.location.lat, user.location.lng);
        const soil = { ph: 6.5, texture: 'Loamy' as any, organicCarbon: 'Medium' as any, nitrogen: 'Medium' as any, phosphorus: 'Medium' as any, potassium: 'Medium' as any, source: 'SoilGrids' as any, confidence: 'Estimate' as any }; 
        const adv = cropGrowthService.getAdvice(stage, w, soil, language);
        
        const weatherAdv = advisoryService.getInputAdvisory(w, language);
        setAdvice({ ...adv, weatherAction: weatherAdv.action, weatherMsg: weatherAdv.message[language] });

        const market = marketService.getMarketData(current.cropName);
        setMarketPrice(market.price);

        // 5. AI Learning: Check past crops of same type for issues
        const pastSameCrop = past.filter(p => p.cropName === current.cropName && p.profitability === 'Loss');
        if (pastSameCrop.length > 0) {
            setAiWarning(t.historyWarning); // "Last time, this crop had issues."
        }
    }
  };

  // --- Live Crop Logic ---
  const handleStartCrop = async () => {
    if (!user) return;
    const newCrop: Crop = {
        id: 'crop_' + Date.now(),
        uid: user.uid,
        cropName: newCropData.name,
        season: newCropData.season as any,
        landAreaAcres: parseFloat(newCropData.acres),
        sowingDate: new Date().toISOString(),
        currentStage: 'Seedling',
        status: 'Growing',
        createdAt: Date.now()
    };
    await firebaseService.createDocument('crops', newCrop);
    setIsAdding(false);
    refreshData();
  };

  const calculateTotalCost = () => {
      const baseCost = (activeCrop?.landAreaAcres || 1) * 5000; 
      const inputCost = inputs.reduce((sum, item) => sum + item.cost, 0);
      return baseCost + inputCost;
  };

  // --- History Logic ---
  const handleHistoryVoiceInput = (field: 'cropName' | 'yieldAmount') => {
      setActiveVoiceField(field);
      const prompt = field === 'cropName' ? "Which crop did you grow?" : "How much was the yield?";
      voiceService.speak(prompt, language);
      
      setTimeout(() => {
          voiceService.listen(
              language,
              (text) => {
                  setHistoryForm(prev => ({ ...prev, [field]: text }));
                  setActiveVoiceField(null);
              },
              () => setActiveVoiceField(null)
          );
      }, 1500);
  };

  const handleSaveHistory = async () => {
      if (!user || !historyForm.cropName) return;
      
      const pastCrop: Crop = {
          id: 'hist_' + Date.now(),
          uid: user.uid,
          cropName: historyForm.cropName,
          season: historyForm.season as any, // In simplified logic, assumes match
          landAreaAcres: 1, // Defaulting for history manual entry
          sowingDate: new Date().toISOString(), // Fallback
          currentStage: 'Harvested',
          status: 'Harvested',
          createdAt: Date.now(),
          yieldAmount: historyForm.yieldAmount,
          profitability: historyForm.profitability
      };

      await firebaseService.createDocument('crops', pastCrop);
      setIsAddingHistory(false);
      // Reset form
      setHistoryForm({
        cropName: '',
        season: 'Kharif',
        year: new Date().getFullYear().toString(),
        yieldAmount: '',
        profitability: 'Average'
      });
      refreshData();
      voiceService.speak("Past record saved successfully.", language);
  };

  return (
    <div className="space-y-6 animate-fade-in pb-20">
      
      {/* Mode Toggle */}
      <div className="flex bg-gray-100 p-1 rounded-xl">
          <button 
            onClick={() => setMode('live')}
            className={`flex-1 py-3 rounded-lg text-sm font-bold flex items-center justify-center gap-2 transition-all ${mode === 'live' ? 'bg-white text-green-700 shadow-sm' : 'text-gray-500'}`}
          >
              <Sprout size={18} /> Live Crop
          </button>
          <button 
            onClick={() => setMode('history')}
            className={`flex-1 py-3 rounded-lg text-sm font-bold flex items-center justify-center gap-2 transition-all ${mode === 'history' ? 'bg-white text-green-700 shadow-sm' : 'text-gray-500'}`}
          >
              <History size={18} /> History
          </button>
      </div>

      {mode === 'live' ? (
        activeCrop ? (
            <div className="space-y-6">
                
                {/* AI Warning from Past Data */}
                {aiWarning && (
                    <div className="bg-amber-50 border-l-4 border-amber-500 p-4 rounded-xl flex items-start gap-3 animate-pulse-slow">
                        <BrainCircuit className="text-amber-600 shrink-0 mt-1" size={20} />
                        <div>
                            <h4 className="font-bold text-amber-900">{t.aiInsight}</h4>
                            <p className="text-amber-800 text-sm">{aiWarning} {t.preventiveAction}</p>
                        </div>
                    </div>
                )}

                {/* 1. Live Status Card */}
                <div className="bg-white rounded-3xl overflow-hidden shadow-lg border border-green-100 relative">
                    <div className="h-32 bg-green-600 relative">
                        <div className="absolute inset-0 bg-black/20"></div>
                        <div className="absolute bottom-4 left-6 text-white">
                            <h2 className="text-3xl font-bold">{activeCrop.cropName}</h2>
                            <p className="opacity-90">{activeCrop.season} • {activeCrop.landAreaAcres} Acres</p>
                        </div>
                    </div>
                    <div className="p-6">
                        <div className="flex justify-between items-end mb-2">
                            <div>
                                <span className="text-xs font-bold text-gray-400 uppercase tracking-wider">Current Stage</span>
                                <h3 className="text-2xl font-bold text-green-800">{activeCrop.currentStage}</h3>
                            </div>
                            <div className="text-right">
                                <span className="text-xs font-bold text-gray-400 uppercase tracking-wider">Age</span>
                                <h3 className="text-2xl font-bold text-gray-800">{cropGrowthService.getCropAge(activeCrop.sowingDate)} Days</h3>
                            </div>
                        </div>
                        <div className="w-full bg-gray-100 rounded-full h-3 mt-4">
                            <div className="bg-green-500 h-3 rounded-full" style={{width: '30%'}}></div>
                        </div>
                    </div>
                </div>

                {/* 2. Advice */}
                {advice && (
                    <div className={`p-5 rounded-2xl border-l-4 shadow-md ${advice.weatherAction === 'safe' ? 'bg-blue-50 border-blue-500' : 'bg-red-50 border-red-500'}`}>
                        <div className="flex items-start gap-3">
                            {advice.weatherAction === 'safe' ? <Sun className="text-blue-600 shrink-0" /> : <CloudRain className="text-red-600 shrink-0" />}
                            <div>
                                <h4 className={`font-bold ${advice.weatherAction === 'safe' ? 'text-blue-900' : 'text-red-900'}`}>
                                    {advice.weatherMsg}
                                </h4>
                                <p className="text-sm mt-1 text-gray-700">{advice.fertilizer}</p>
                            </div>
                        </div>
                    </div>
                )}

                {/* 3. Financials & Inputs */}
                <div className="bg-white p-6 rounded-3xl shadow-md border border-gray-100">
                    <div className="flex justify-between items-center mb-6">
                        <h3 className="font-bold text-gray-800 flex items-center gap-2"><IndianRupee size={20}/> Financials</h3>
                        <div className="text-right">
                            <span className="text-xs text-gray-500">Total Investment</span>
                            <div className="font-bold text-xl text-gray-900">₹{calculateTotalCost()}</div>
                        </div>
                    </div>

                    <div className="space-y-4">
                        <h4 className="font-bold text-sm text-gray-500 uppercase tracking-wider">Input Log</h4>
                        {inputs.length === 0 ? (
                            <p className="text-sm text-gray-400 italic">No inputs added yet.</p>
                        ) : (
                            inputs.map((input) => (
                                <div key={input.id} className="flex justify-between items-center bg-gray-50 p-3 rounded-xl">
                                    <div className="flex items-center gap-3">
                                        <div className="bg-white p-2 rounded-full text-blue-600 shadow-sm"><Droplets size={16}/></div>
                                        <div>
                                            <div className="font-bold text-gray-800">{input.name}</div>
                                            <div className="text-xs text-gray-500">{new Date(input.date).toLocaleDateString()}</div>
                                        </div>
                                    </div>
                                    <div className="text-right">
                                        <div className="font-bold text-gray-900">{input.quantity} {input.unit}</div>
                                        <div className="text-xs text-gray-500">₹{input.cost}</div>
                                    </div>
                                </div>
                            ))
                        )}
                        <button className="w-full py-3 border-2 border-dashed border-gray-300 text-gray-500 font-bold rounded-xl flex items-center justify-center gap-2 hover:bg-gray-50 transition-colors">
                            <Plus size={20} /> Add Input (Demo)
                        </button>
                    </div>
                </div>
            </div>
        ) : (
            // Empty State - Add Crop
            <div className="text-center py-10 bg-gray-50 rounded-3xl border-2 border-dashed border-gray-200">
                {!isAdding ? (
                    <>
                        <Sprout size={48} className="mx-auto text-gray-300 mb-4" />
                        <h3 className="text-xl font-bold text-gray-500">No Active Crop</h3>
                        <button 
                            onClick={() => setIsAdding(true)}
                            className="mt-4 bg-green-600 text-white px-6 py-3 rounded-xl font-bold shadow-lg"
                        >
                            Start New Crop
                        </button>
                    </>
                ) : (
                    <div className="p-4 text-left">
                        <h3 className="font-bold text-lg mb-4">Start New Crop Cycle</h3>
                        <div className="space-y-3">
                            <input type="text" value={newCropData.name} onChange={e => setNewCropData({...newCropData, name: e.target.value})} className="w-full p-3 border rounded-xl" placeholder="Crop Name" />
                            <select value={newCropData.season} onChange={e => setNewCropData({...newCropData, season: e.target.value})} className="w-full p-3 border rounded-xl">
                                <option>Kharif</option>
                                <option>Rabi</option>
                                <option>Zaid</option>
                            </select>
                            <input type="number" value={newCropData.acres} onChange={e => setNewCropData({...newCropData, acres: e.target.value})} className="w-full p-3 border rounded-xl" placeholder="Acres" />
                            <button onClick={handleStartCrop} className="w-full bg-green-600 text-white py-3 rounded-xl font-bold">Start Journey</button>
                        </div>
                    </div>
                )}
            </div>
        )
      ) : (
        // HISTORY MODE
        <div className="space-y-4">
             {/* Add History Button */}
             {!isAddingHistory ? (
                <button 
                    onClick={() => setIsAddingHistory(true)}
                    className="w-full py-4 border-2 border-dashed border-gray-300 text-gray-500 font-bold rounded-xl flex items-center justify-center gap-2 hover:bg-gray-50 transition-colors"
                >
                    <Plus size={20} /> Add Past Record
                </button>
             ) : (
                <div className="bg-white p-6 rounded-2xl shadow-lg border border-green-200 animate-fade-in">
                    <div className="flex justify-between items-center mb-4">
                        <h3 className="font-bold text-lg text-green-800">Add Past Crop Record</h3>
                        <button onClick={() => setIsAddingHistory(false)} className="text-gray-400 hover:text-red-500">
                            <X size={20} />
                        </button>
                    </div>

                    <div className="space-y-4">
                        {/* Crop Name */}
                        <div>
                            <label className="text-xs font-bold text-gray-500 uppercase">Crop Name</label>
                            <div className="relative">
                                <input 
                                    type="text" 
                                    value={historyForm.cropName}
                                    onChange={(e) => setHistoryForm({...historyForm, cropName: e.target.value})}
                                    className="w-full p-3 pr-10 border rounded-xl focus:ring-2 focus:ring-green-500 outline-none" 
                                    placeholder="e.g. Wheat"
                                />
                                <button 
                                    onClick={() => handleHistoryVoiceInput('cropName')}
                                    className={`absolute right-2 top-1/2 -translate-y-1/2 p-2 rounded-full ${activeVoiceField === 'cropName' ? 'bg-red-500 text-white animate-pulse' : 'text-gray-400'}`}
                                >
                                    {activeVoiceField === 'cropName' ? <MicOff size={16}/> : <Mic size={16}/>}
                                </button>
                            </div>
                        </div>

                        <div className="flex gap-4">
                            <div className="flex-1">
                                <label className="text-xs font-bold text-gray-500 uppercase">Season</label>
                                <select 
                                    value={historyForm.season}
                                    onChange={(e) => setHistoryForm({...historyForm, season: e.target.value})}
                                    className="w-full p-3 border rounded-xl bg-white"
                                >
                                    <option>Kharif</option>
                                    <option>Rabi</option>
                                    <option>Zaid</option>
                                </select>
                            </div>
                            <div className="flex-1">
                                <label className="text-xs font-bold text-gray-500 uppercase">Year</label>
                                <select 
                                    value={historyForm.year}
                                    onChange={(e) => setHistoryForm({...historyForm, year: e.target.value})}
                                    className="w-full p-3 border rounded-xl bg-white"
                                >
                                    <option>2024</option>
                                    <option>2023</option>
                                    <option>2022</option>
                                    <option>2021</option>
                                </select>
                            </div>
                        </div>

                        {/* Yield */}
                        <div>
                            <label className="text-xs font-bold text-gray-500 uppercase">Yield (Approx)</label>
                            <div className="relative">
                                <input 
                                    type="text" 
                                    value={historyForm.yieldAmount}
                                    onChange={(e) => setHistoryForm({...historyForm, yieldAmount: e.target.value})}
                                    className="w-full p-3 pr-10 border rounded-xl focus:ring-2 focus:ring-green-500 outline-none" 
                                    placeholder="e.g. 2000 kg"
                                />
                                <button 
                                    onClick={() => handleHistoryVoiceInput('yieldAmount')}
                                    className={`absolute right-2 top-1/2 -translate-y-1/2 p-2 rounded-full ${activeVoiceField === 'yieldAmount' ? 'bg-red-500 text-white animate-pulse' : 'text-gray-400'}`}
                                >
                                    {activeVoiceField === 'yieldAmount' ? <MicOff size={16}/> : <Mic size={16}/>}
                                </button>
                            </div>
                        </div>

                        {/* Profitability */}
                        <div>
                            <label className="text-xs font-bold text-gray-500 uppercase">Outcome</label>
                            <div className="flex gap-2">
                                {['High', 'Average', 'Loss'].map((opt) => (
                                    <button
                                        key={opt}
                                        onClick={() => setHistoryForm({...historyForm, profitability: opt as any})}
                                        className={`flex-1 py-2 rounded-lg font-bold text-sm border transition-colors ${
                                            historyForm.profitability === opt 
                                            ? (opt === 'High' ? 'bg-green-100 border-green-500 text-green-700' : (opt === 'Loss' ? 'bg-red-100 border-red-500 text-red-700' : 'bg-orange-100 border-orange-500 text-orange-700'))
                                            : 'bg-white border-gray-200 text-gray-500'
                                        }`}
                                    >
                                        {opt}
                                    </button>
                                ))}
                            </div>
                        </div>

                        <button 
                            onClick={handleSaveHistory}
                            className="w-full bg-green-600 text-white py-3 rounded-xl font-bold shadow-md hover:bg-green-700 flex items-center justify-center gap-2"
                        >
                            <Save size={20} /> Save Record
                        </button>
                    </div>
                </div>
             )}

             {/* List History */}
             {history.length === 0 && !isAddingHistory && <p className="text-center text-gray-400 py-10">No past records found.</p>}
             
             {history.map((record) => (
                 <div key={record.id} className="bg-white p-5 rounded-2xl shadow-sm border border-gray-100 flex justify-between items-center">
                     <div>
                         <span className="text-xs font-bold text-gray-400 uppercase tracking-wider">{record.season}</span>
                         <h3 className="text-lg font-bold text-gray-800">{record.cropName}</h3>
                         <div className="flex items-center gap-2 mt-1">
                             <span className={`px-2 py-0.5 rounded text-xs font-bold ${record.profitability === 'High' ? 'bg-green-100 text-green-700' : (record.profitability === 'Loss' ? 'bg-red-100 text-red-700' : 'bg-orange-100 text-orange-700')}`}>
                                 {record.profitability || 'Average'} Profit
                             </span>
                             {record.yieldAmount && <span className="text-xs text-gray-500">• {record.yieldAmount}</span>}
                         </div>
                     </div>
                     <ChevronRight className="text-gray-300" />
                 </div>
             ))}
        </div>
      )}
    </div>
  );
};

export default MyCropJourney;