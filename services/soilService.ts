import { SoilData, Language } from '../types';
import { UI_TEXT } from './knowledgeBase';

// Deterministic random generator based on seed (lat+lng)
function mulberry32(a: number) {
    return function() {
      var t = a += 0x6D2B79F5;
      t = Math.imul(t ^ (t >>> 15), t | 1);
      t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    }
}

export const soilService = {
  // Simulates fetching data from SoilGrids based on location
  getSoilData(lat: number, lng: number): SoilData {
    const seed = lat * 1000 + lng;
    const rand = mulberry32(Math.floor(seed));
    
    // Simulate pH (5.0 to 8.5)
    const ph = 5.0 + (rand() * 3.5);
    
    // Simulate Texture
    const rTex = rand();
    let texture: SoilData['texture'] = 'Loamy';
    if (rTex < 0.33) texture = 'Sandy';
    else if (rTex > 0.66) texture = 'Clay';
    
    // Simulate Organic Carbon (influences Nitrogen)
    const rOc = rand();
    let organicCarbon: SoilData['organicCarbon'] = 'Medium';
    if (rOc < 0.3) organicCarbon = 'Low';
    else if (rOc > 0.7) organicCarbon = 'High';

    // Derive Nutrients from Organic Carbon & Texture
    let nitrogen: SoilData['nitrogen'] = organicCarbon; // Direct correlation
    
    let potassium: SoilData['potassium'] = 'Medium';
    if (texture === 'Clay') potassium = 'High';
    if (texture === 'Sandy') potassium = 'Low';

    let phosphorus: SoilData['phosphorus'] = 'Medium';
    if (ph < 6.0 || ph > 7.5) phosphorus = 'Low'; // P is locked up in extreme pH
    else phosphorus = 'High';

    return {
      ph: parseFloat(ph.toFixed(1)),
      texture,
      organicCarbon,
      nitrogen,
      phosphorus,
      potassium,
      source: 'SoilGrids',
      confidence: 'Estimate'
    };
  },

  // Simulates OCR processing of an uploaded file to return a High Confidence report
  async analyzeUploadedReport(file: File): Promise<SoilData> {
    // Simulate processing delay
    await new Promise(resolve => setTimeout(resolve, 2000));

    // For demo purposes, return a specific "Healthy" report distinct from random fallback
    // In real app, this would send file to backend OCR
    return {
      ph: 6.8,
      texture: 'Loamy',
      organicCarbon: 'High',
      nitrogen: 'Medium',
      phosphorus: 'High',
      potassium: 'Medium',
      source: 'LabReport',
      confidence: 'Verified'
    };
  },

  // Generate actionable insights from soil data
  getSoilInsights(soil: SoilData, language: Language) {
    const t = UI_TEXT[language];
    const insights = {
      status: t.healthy,
      isHealthy: true,
      summary: "",
      fertilizer: [] as string[],
      tips: [] as string[]
    };

    // 1. Determine Status
    if (soil.ph < 6.0 || soil.ph > 7.5 || soil.nitrogen === 'Low' || soil.organicCarbon === 'Low') {
      insights.status = t.needsCare;
      insights.isHealthy = false;
    }

    // 2. Summary Text
    const phType = soil.ph < 6.0 ? t.acidic : (soil.ph > 7.5 ? t.alkaline : t.neutral);
    const textureType = soil.texture === 'Sandy' ? t.sandy : (soil.texture === 'Clay' ? t.clay : t.loamy);
    
    // Add "Verified" text if source is LabReport
    let prefix = "";
    if (soil.source === 'LabReport') {
        prefix = `[${t.verified}] `;
    }

    insights.summary = `${prefix}${t.soilSummary} ${t.is} ${phType} ${t.and} ${textureType}.`;

    // 3. Fertilizer Advice
    if (soil.nitrogen === 'High') insights.fertilizer.push(t.reduceNitrogen);
    else if (soil.nitrogen === 'Low') insights.fertilizer.push(t.addCompost);
    
    if (soil.phosphorus === 'Low') insights.fertilizer.push(t.addPhosphorus);
    if (soil.potassium === 'Low' || soil.potassium === 'Medium') insights.fertilizer.push(t.addPotash);

    // 4. Farming Tips
    if (soil.texture === 'Sandy') insights.tips.push(t.waterFreq);
    if (soil.texture === 'Clay') insights.tips.push(t.drainage);
    if (soil.ph < 6.0) insights.tips.push(t.addCompost); // Generic advice for acid
    
    if (insights.fertilizer.length === 0) insights.fertilizer.push(t.perfectDay); // Reuse "Conditions Perfect" roughly

    return insights;
  }
};