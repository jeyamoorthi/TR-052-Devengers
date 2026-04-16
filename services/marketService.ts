import { MarketData } from '../types';

export const marketService = {
  // Deterministic market prices based on current date
  getMarketData(cropName: string): MarketData {
    // Generate a pseudo-random price based on crop name chars
    const base = cropName.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);
    
    // Simulate trend based on date (odd/even days)
    const day = new Date().getDate();
    const trend: MarketData['trend'] = day % 3 === 0 ? 'down' : (day % 3 === 1 ? 'up' : 'stable');
    
    // Base Price mapping
    let basePrice = 2000;
    if (cropName.toLowerCase().includes('rice') || cropName.toLowerCase().includes('paddy')) basePrice = 2200;
    if (cropName.toLowerCase().includes('wheat')) basePrice = 2400;
    if (cropName.toLowerCase().includes('tomato')) basePrice = 1500;
    if (cropName.toLowerCase().includes('potato')) basePrice = 1200;
    if (cropName.toLowerCase().includes('maize') || cropName.toLowerCase().includes('corn')) basePrice = 1900;

    // Adjust price by trend
    const variance = (base % 50) * 10;
    let currentPrice = basePrice + variance;
    
    if (trend === 'up') currentPrice += 150;
    if (trend === 'down') currentPrice -= 150;

    return {
      crop: cropName,
      price: currentPrice,
      unit: 'quintal', // 100kg
      trend: trend,
      difference: trend === 'stable' ? 0 : 150
    };
  }
};