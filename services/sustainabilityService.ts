import { UserProfile, WeatherData } from '../types';

export interface SustainabilityProfile {
  overallScore: number; // 0-100
  grade: 'A+' | 'A' | 'B+' | 'B' | 'C' | 'D';
  pillars: SustainabilityPillar[];
  insights: string[];
  recommendations: string[];
}

export interface SustainabilityPillar {
  name: string;
  icon: string;
  score: number;
  label: string;
  color: string;
}

export const sustainabilityService = {
  evaluate(user: UserProfile, weather: WeatherData): SustainabilityProfile {
    const crop = user.primaryCrop?.toLowerCase() || 'wheat';
    const irrigation = user.irrigationType || 'Rainfed';
    const soil = user.soilType || 'Loamy';
    const experience = user.farmingExperience || 5;
    const farmSize = user.farmSizeAcres || 2;

    // --- Pillar 1: Water Efficiency ---
    let waterScore = 50;
    if (irrigation === 'Drip') waterScore = 95;
    else if (irrigation === 'Rainfed') waterScore = 80;
    else if (irrigation === 'Canal') waterScore = 60;
    else if (irrigation === 'Tube Well') waterScore = 40;
    if (weather.condition.includes('Rain')) waterScore = Math.min(100, waterScore + 10);

    // --- Pillar 2: Soil Health ---
    let soilScore = 60;
    if (soil === 'Loamy' || soil === 'Black') soilScore = 85;
    else if (soil === 'Clay') soilScore = 70;
    else if (soil === 'Sandy') soilScore = 45;
    if (weather.humidity > 70) soilScore = Math.min(100, soilScore + 5);

    // --- Pillar 3: Crop Diversity / Sustainability ---
    let cropScore = 60;
    const ecoFriendlyCrops = ['millet', 'bajra', 'jowar', 'pulses', 'dal', 'sorghum', 'groundnut'];
    const heavyCrops = ['rice', 'paddy', 'sugarcane', 'cotton'];
    if (ecoFriendlyCrops.some(c => crop.includes(c))) cropScore = 90;
    else if (heavyCrops.some(c => crop.includes(c))) cropScore = 35;
    else cropScore = 65; // moderate (wheat, maize)

    // --- Pillar 4: Farming Experience / Knowledge ---
    let knowledgeScore = Math.min(100, 40 + experience * 5);

    // --- Pillar 5: Climate Resilience ---
    let climateScore = 65;
    if (weather.alerts.length === 0) climateScore = 85;
    else if (weather.alerts.some(a => a.severity === 'High')) climateScore = 40;
    else climateScore = 60;

    const overallScore = Math.floor(
      (waterScore + soilScore + cropScore + knowledgeScore + climateScore) / 5
    );

    let grade: SustainabilityProfile['grade'];
    if (overallScore >= 85) grade = 'A+';
    else if (overallScore >= 75) grade = 'A';
    else if (overallScore >= 65) grade = 'B+';
    else if (overallScore >= 55) grade = 'B';
    else if (overallScore >= 40) grade = 'C';
    else grade = 'D';

    const pillars: SustainabilityPillar[] = [
      { name: 'Water Efficiency', icon: '💧', score: waterScore, label: irrigation, color: '#3b82f6' },
      { name: 'Soil Health', icon: '🌍', score: soilScore, label: soil, color: '#92400e' },
      { name: 'Eco-Crop Index', icon: '🌿', score: cropScore, label: user.primaryCrop || 'Unknown', color: '#16a34a' },
      { name: 'Farm Knowledge', icon: '🧠', score: knowledgeScore, label: `${experience} yrs exp.`, color: '#7c3aed' },
      { name: 'Climate Resilience', icon: '☁️', score: climateScore, label: `${weather.alerts.length} alerts`, color: '#0891b2' },
    ];

    const insights: string[] = [];
    if (waterScore >= 80) insights.push('Your irrigation method is highly water-efficient — great for carbon credits.');
    if (cropScore >= 80) insights.push('Choosing low-emission crops puts you ahead of 85% of farmers in your region.');
    if (soilScore < 50) insights.push('Sandy soil loses nutrients faster — consider cover cropping.');
    if (climateScore < 50) insights.push('High weather risk this season — check disease alerts daily.');
    if (overallScore >= 70) insights.push('Your farm qualifies for Voluntary Carbon Market registration.');

    const recommendations: string[] = [];
    if (irrigation === 'Tube Well') recommendations.push('Switch to drip irrigation to boost score by +20 points and save water.');
    if (heavyCrops.some(c => crop.includes(c))) recommendations.push('Consider intercropping with millet or pulses to reduce emissions.');
    if (soilScore < 65) recommendations.push('Apply organic compost to improve soil organic carbon.');
    recommendations.push('Log your fertilizer inputs to prove sustainable practices for carbon audit.');

    return { overallScore, grade, pillars, insights, recommendations };
  },
};
