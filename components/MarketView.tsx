import React, { useContext, useEffect, useState } from 'react';
import { AppContext } from '../App';
import { MarketData } from '../types';
import { marketService } from '../services/marketService';
import { voiceService } from '../services/voiceService';
import { UI_TEXT } from '../services/knowledgeBase';
import { TrendingUp, TrendingDown, Minus, IndianRupee, Volume2 } from 'lucide-react';

const MarketView: React.FC = () => {
  const context = useContext(AppContext);
  if (!context) return null;
  const { user, language } = context;
  const t = UI_TEXT[language];

  const [marketData, setMarketData] = useState<MarketData | null>(null);

  useEffect(() => {
    if (user?.primaryCrop) {
      const data = marketService.getMarketData(user.primaryCrop);
      setMarketData(data);

      // Auto-speak
      setTimeout(() => {
        const trendText = data.trend === 'up' ? t.priceUp : (data.trend === 'down' ? t.priceDown : 'Price is stable.');
        const text = `${t.marketPrice} for ${data.crop} is ${data.price} rupees per ${data.unit}. ${trendText}`;
        voiceService.speak(text, language);
      }, 1000);
    }
  }, [user]);

  if (!marketData) return null;

  const isGoodToSell = marketData.trend === 'up' || marketData.trend === 'stable';

  return (
    <div className="bg-white rounded-3xl shadow-lg overflow-hidden animate-fade-in border border-indigo-100 p-6">
      <div className="flex justify-between items-start mb-4">
        <div>
           <h2 className="text-xl font-bold text-indigo-900 flex items-center gap-2">
             <IndianRupee size={24} /> {t.marketPrice}
           </h2>
           <p className="text-gray-500 text-sm">{marketData.crop} • {new Date().toLocaleDateString()}</p>
        </div>
        <button onClick={() => {
            const trendText = marketData.trend === 'up' ? t.priceUp : (marketData.trend === 'down' ? t.priceDown : 'Price is stable.');
            voiceService.speak(`${t.marketPrice} is ${marketData.price}. ${trendText}`, language);
        }}>
            <Volume2 className="text-indigo-600" size={24}/>
        </button>
      </div>

      <div className="text-center py-6 bg-indigo-50 rounded-2xl mb-6">
         <h3 className="text-5xl font-bold text-indigo-700">₹{marketData.price}</h3>
         <p className="text-gray-500 font-medium mt-1">per {marketData.unit}</p>
      </div>

      <div className="flex items-center justify-between mb-6">
         <div className="flex items-center gap-2">
            <span className="text-gray-600 font-medium">Trend:</span>
            {marketData.trend === 'up' && <div className="flex items-center text-green-600 font-bold bg-green-100 px-2 py-1 rounded"><TrendingUp size={16} /> Up</div>}
            {marketData.trend === 'down' && <div className="flex items-center text-red-600 font-bold bg-red-100 px-2 py-1 rounded"><TrendingDown size={16} /> Down</div>}
            {marketData.trend === 'stable' && <div className="flex items-center text-gray-600 font-bold bg-gray-100 px-2 py-1 rounded"><Minus size={16} /> Stable</div>}
         </div>
         <div className="text-sm font-medium text-gray-500">
            {marketData.difference > 0 ? `+₹${marketData.difference}` : (marketData.difference < 0 ? `-₹${Math.abs(marketData.difference)}` : 'No change')} vs last week
         </div>
      </div>

      <div className={`p-4 rounded-xl text-center font-bold text-lg ${isGoodToSell ? 'bg-green-100 text-green-800' : 'bg-orange-100 text-orange-800'}`}>
          {isGoodToSell ? t.sellNow : t.wait}
      </div>
    </div>
  );
};

export default MarketView;