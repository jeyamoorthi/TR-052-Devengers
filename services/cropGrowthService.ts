import { UserProfile, WeatherData, SoilData, CropStage, Language } from '../types';
import { UI_TEXT } from './knowledgeBase';

export const cropGrowthService = {
  // Calculate age in days
  getCropAge(sowingDate: string): number {
    const start = new Date(sowingDate).getTime();
    const now = new Date().getTime();
    const diff = now - start;
    return Math.floor(diff / (1000 * 60 * 60 * 24));
  },

  // Estimate stage based on days (Simplified Logic for Demo)
  // Real app would use specific crop varieties
  getStage(age: number): CropStage {
    if (age < 20) return 'Seedling';
    if (age < 50) return 'Vegetative';
    if (age < 80) return 'Flowering';
    if (age < 110) return 'Fruiting';
    return 'Harvest';
  },

  // Determine Risks
  getRisk(weather: WeatherData, age: number): { level: 'Low' | 'Medium' | 'High', reason: string } {
    if (weather.humidity > 80 && (age > 50 && age < 110)) {
        return { level: 'High', reason: 'High humidity during flowering/fruiting increases disease risk.' };
    }
    if (weather.condition.includes('Rain') && age > 110) {
        return { level: 'High', reason: 'Rain near harvest can damage the crop.' };
    }
    if (weather.alerts.length > 0) {
        return { level: 'Medium', reason: 'Weather alerts present.' };
    }
    return { level: 'Low', reason: 'Weather is favorable.' };
  },

  // Generate Stage-Aware Advice
  getAdvice(stage: CropStage, weather: WeatherData, soil: SoilData, language: Language) {
    const t = UI_TEXT[language];
    
    let fertilizerMsg = "";
    let financialMsg = "";
    
    // Fertilizer Logic
    if (stage === 'Seedling') {
        fertilizerMsg = soil.phosphorus === 'Low' 
            ? "Apply phosphorus for root development." 
            : "Soil phosphorus is adequate. No extra input needed.";
    } else if (stage === 'Vegetative') {
        fertilizerMsg = "Apply Nitrogen (Urea) for leafy growth, but do not overuse.";
    } else if (stage === 'Flowering') {
        fertilizerMsg = "Stop Urea. Apply Potash (MOP) now for better fruit setting.";
    } else if (stage === 'Fruiting') {
        fertilizerMsg = "Maintain soil moisture. Avoid heavy fertilizer application now.";
    } else {
        fertilizerMsg = "Stop all fertilizers. Prepare for harvest.";
    }

    // Weather Override
    if (weather.precipProb > 60) {
        fertilizerMsg = "Rain expected. Do NOT apply fertilizer today (it will wash away).";
    }

    // Financial Logic (Mock Calculation)
    const baseCost = 5000;
    const costPerDay = 100;
    const invested = baseCost + (cropGrowthService.getCropAge(new Date().toISOString()) * costPerDay); // Approximate
    
    if (stage === 'Flowering' || stage === 'Fruiting') {
        financialMsg = `You have invested approx ₹${invested}. Avoid extra spraying unless disease is confirmed.`;
    } else {
        financialMsg = `Current investment is ₹${invested}. Monitor costs closely.`;
    }

    return {
        fertilizer: fertilizerMsg,
        financial: financialMsg,
        investedAmount: invested
    };
  }
};