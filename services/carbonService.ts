import { UserProfile, WeatherData } from '../types';

export interface CarbonProfile {
  co2SavedTons: number;
  estimatedValueINR: number;
  yearlyProjectionINR: number;
  emissionScore: number; // 0-100 (100 = cleanest)
  breakdown: CarbonBreakdown[];
  creditHistory: CreditHistory[];
  sustainabilityBadge: 'Bronze' | 'Silver' | 'Gold' | 'Platinum';
}

export interface CarbonBreakdown {
  category: string;
  icon: string;
  savedKg: number;
  contribution: string; // e.g., "Positive" | "Negative"
}

export interface CreditHistory {
  month: string;
  credits: number;
  valueINR: number;
}

// Emission factors per crop type (CO2 kg per acre per season)
const CROP_EMISSION_FACTORS: Record<string, { emission: number; label: string }> = {
  Rice: { emission: 1800, label: 'flooded paddy — high methane' },
  Paddy: { emission: 1800, label: 'flooded paddy — high methane' },
  Wheat: { emission: 600, label: 'moderate emission' },
  Maize: { emission: 500, label: 'moderate emission' },
  Corn: { emission: 500, label: 'moderate emission' },
  Millet: { emission: 180, label: 'dryland — very low emission' },
  Bajra: { emission: 180, label: 'dryland — very low emission' },
  Jowar: { emission: 200, label: 'dryland — low emission' },
  Sorghum: { emission: 200, label: 'dryland — low emission' },
  Pulses: { emission: 150, label: 'nitrogen-fixing — carbon positive' },
  Groundnut: { emission: 220, label: 'low emission legume' },
  Cotton: { emission: 800, label: 'high water + chemical use' },
  Sugarcane: { emission: 1200, label: 'high water footprint' },
  Tomato: { emission: 350, label: 'moderate horticulture' },
  Vegetables: { emission: 300, label: 'light emission' },
};

const IRRIGATION_FACTORS: Record<string, number> = {
  Drip: 0.6,      // 40% water saved vs baseline → carbon credit multiplier
  Canal: 1.0,
  Rainfed: 0.8,   // No pump energy
  'Tube Well': 1.2, // More energy/groundwater use
};

const SOIL_FACTORS: Record<string, number> = {
  Sandy: 0.9,
  Loamy: 0.85,
  Clay: 1.0,
  Black: 0.9,
  Red: 0.95,
  Unknown: 1.0,
};

// Carbon credit price in India (voluntary market): ~₹2000 per ton CO2
const CREDIT_PRICE_PER_TON_INR = 2000;

// Conventional farming baseline (average Indian farm): 900 kg CO2/acre
const CONVENTIONAL_BASELINE_KG_ACRE = 900;

export const carbonService = {
  calculate(user: UserProfile, weather: WeatherData): CarbonProfile {
    const farmSize = user.farmSizeAcres || 2;
    const crop = user.primaryCrop || 'Wheat';
    const irrigation = user.irrigationType || 'Rainfed';
    const soil = user.soilType || 'Loamy';

    // Find emission factor (fuzzy match)
    const cropKey = Object.keys(CROP_EMISSION_FACTORS).find(k =>
      crop.toLowerCase().includes(k.toLowerCase())
    ) || 'Wheat';
    const cropData = CROP_EMISSION_FACTORS[cropKey];

    const irrigFactor = IRRIGATION_FACTORS[irrigation] || 1.0;
    const soilFactor = SOIL_FACTORS[soil] || 1.0;

    // Weather factor: rainy conditions reduce irrigation energy
    const weatherFactor = weather.condition.includes('Rain') ? 0.85 : 1.0;

    // Actual emissions of this farm (kg CO2)
    const actualEmissionsKg =
      cropData.emission * farmSize * irrigFactor * soilFactor * weatherFactor;

    // Conventional baseline
    const baselineKg = CONVENTIONAL_BASELINE_KG_ACRE * farmSize;

    // CO2 saved vs conventional farming
    const co2SavedKg = Math.max(0, baselineKg - actualEmissionsKg);
    const co2SavedTons = parseFloat((co2SavedKg / 1000).toFixed(2));

    // Monetary value
    const estimatedValueINR = Math.floor(co2SavedTons * CREDIT_PRICE_PER_TON_INR);
    const yearlyProjectionINR = Math.floor(estimatedValueINR * 2.5); // 2.5 seasons/year estimate

    // Emission Score (100 = cleanest)
    const emissionScore = Math.min(
      100,
      Math.floor(100 - (actualEmissionsKg / baselineKg) * 60)
    );

    // Sustainability badge
    let sustainabilityBadge: 'Bronze' | 'Silver' | 'Gold' | 'Platinum';
    if (emissionScore >= 80) sustainabilityBadge = 'Platinum';
    else if (emissionScore >= 65) sustainabilityBadge = 'Gold';
    else if (emissionScore >= 50) sustainabilityBadge = 'Silver';
    else sustainabilityBadge = 'Bronze';

    // Breakdown
    const breakdown: CarbonBreakdown[] = [
      {
        category: 'Crop Choice',
        icon: '🌾',
        savedKg: Math.floor((CONVENTIONAL_BASELINE_KG_ACRE - cropData.emission) * farmSize),
        contribution: cropData.emission < 600 ? 'Positive' : 'Negative',
      },
      {
        category: 'Irrigation Method',
        icon: '💧',
        savedKg: Math.floor(irrigation === 'Drip' ? 200 * farmSize : irrigation === 'Rainfed' ? 80 * farmSize : 0),
        contribution: irrigFactor < 1.0 ? 'Positive' : 'Negative',
      },
      {
        category: 'Soil Health',
        icon: '🌍',
        savedKg: Math.floor((1.0 - soilFactor) * 100 * farmSize),
        contribution: soilFactor < 1.0 ? 'Positive' : 'Neutral',
      },
      {
        category: 'Weather Alignment',
        icon: '☁️',
        savedKg: Math.floor((1.0 - weatherFactor) * actualEmissionsKg),
        contribution: weather.condition.includes('Rain') ? 'Positive' : 'Neutral',
      },
    ];

    // Monthly credit history (last 6 months, deterministic)
    const months = ['Oct', 'Nov', 'Dec', 'Jan', 'Feb', 'Mar'];
    const creditHistory: CreditHistory[] = months.map((month, i) => {
      const variation = 0.8 + (i * 0.07); // growing trend
      const monthCredits = parseFloat((co2SavedTons * variation * 0.5).toFixed(2));
      return {
        month,
        credits: monthCredits,
        valueINR: Math.floor(monthCredits * CREDIT_PRICE_PER_TON_INR),
      };
    });

    return {
      co2SavedTons,
      estimatedValueINR,
      yearlyProjectionINR,
      emissionScore,
      breakdown,
      creditHistory,
      sustainabilityBadge,
    };
  },
};
