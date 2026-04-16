/**
 * cropRecommendationService.ts
 * ─────────────────────────────────────────────────────────────────────────────
 * AI-based exotic crop recommendation engine.
 * - Uses soil nutrients + weather forecast + market trends via Gemini AI
 * - Returns top crop suggestions with yield, demand, risk, and vendor matches
 * - Integrates with marketLinkageService for vendor matching
 */

import { GoogleGenAI } from '@google/genai';
import {
  CropRecommendationResult,
  UserProfile,
  UserAdvancedData,
  MarketTrend,
  VendorBuyer,
} from '../types';
import { firebaseService } from './firebaseService';
import { marketLinkageService } from './marketLinkageService';

const AI_KEY = (import.meta.env.VITE_GEMINI_API_KEY as string | undefined) || '';
const ai = AI_KEY ? new GoogleGenAI({ apiKey: AI_KEY }) : null;

// ─── Mock exotic crop catalog ─────────────────────────────────────────────────

const EXOTIC_CROP_CATALOG: Omit<CropRecommendationResult, 'vendor_matches'>[] = [
  {
    id: 'dragon-fruit',
    crop_name: 'Dragon Fruit',
    exotic: true,
    suitability_score: 88,
    expected_yield_qtl_acre: 8,
    market_demand: 'Very High',
    risk_level: 'Low',
    estimated_revenue_per_acre: 240000,
    reasons: ['High urban demand', 'Low water requirement', 'Premium export price'],
    soil_match: 'Well-drained sandy loam soils with pH 5.5–7',
    weather_match: 'Tropical/subtropical climate; drought tolerant',
    market_match: 'Growing health-food market; ₹60–100/kg retail',
    grow_duration_days: 365,
  },
  {
    id: 'broccoli',
    crop_name: 'Broccoli',
    exotic: true,
    suitability_score: 82,
    expected_yield_qtl_acre: 60,
    market_demand: 'High',
    risk_level: 'Low',
    estimated_revenue_per_acre: 90000,
    reasons: ['High demand from supermarkets & hotels', 'Short crop cycle', 'Good cold-storage life'],
    soil_match: 'Fertile loamy soil with pH 6–7',
    weather_match: 'Cool weather; 15–20°C ideal',
    market_match: 'Urban vegetable market; ₹30–50/kg',
    grow_duration_days: 75,
  },
  {
    id: 'strawberry',
    crop_name: 'Strawberry',
    exotic: true,
    suitability_score: 79,
    expected_yield_qtl_acre: 100,
    market_demand: 'Very High',
    risk_level: 'Medium',
    estimated_revenue_per_acre: 320000,
    reasons: ['Premium price point', 'High demand from juice/confectionery industry', 'Agri-tourism potential'],
    soil_match: 'Sandy loam with good drainage, pH 5.5–6.5',
    weather_match: 'Cool winters; 18–22°C during fruiting',
    market_match: 'Direct-to-consumer & export; ₹80–150/kg',
    grow_duration_days: 120,
  },
  {
    id: 'moringa',
    crop_name: 'Moringa (Drumstick)',
    exotic: false,
    suitability_score: 91,
    expected_yield_qtl_acre: 40,
    market_demand: 'Very High',
    risk_level: 'Low',
    estimated_revenue_per_acre: 80000,
    reasons: ['Export demand for leaves/powder', 'Drought-tolerant', 'Multiple harvests per year'],
    soil_match: 'Any well-drained soil; pH 6–7',
    weather_match: 'Arid and semi-arid; tolerates 48°C',
    market_match: 'Health supplement export; ₹30–60/kg leaves',
    grow_duration_days: 90,
  },
  {
    id: 'quinoa',
    crop_name: 'Quinoa',
    exotic: true,
    suitability_score: 70,
    expected_yield_qtl_acre: 10,
    market_demand: 'High',
    risk_level: 'Medium',
    estimated_revenue_per_acre: 140000,
    reasons: ['Superfood demand growing rapidly', 'High protein content', 'Government support for nutri-cereals'],
    soil_match: 'Sandy loam, pH 5.5–7.5; salt-tolerant',
    weather_match: 'Cool to moderate climate; 15–25°C',
    market_match: 'Health food stores & export; ₹200–350/kg',
    grow_duration_days: 100,
  },
  {
    id: 'lavender',
    crop_name: 'Lavender',
    exotic: true,
    suitability_score: 65,
    expected_yield_qtl_acre: 3,
    market_demand: 'High',
    risk_level: 'High',
    estimated_revenue_per_acre: 180000,
    reasons: ['Essential oil export value', 'Tourism/agri-tourism potential', 'Perennial crop longevity'],
    soil_match: 'Well-drained, alkaline soil pH 6.5–7.5',
    weather_match: 'Mediterranean climate; cool nights',
    market_match: 'Aromatherapy/cosmetics sector; ₹2000–4000/kg oil',
    grow_duration_days: 180,
  },
];

// ─── Score adjustment based on user context ───────────────────────────────────

function adjustScore(
  base: Omit<CropRecommendationResult, 'vendor_matches'>,
  user: UserProfile,
  advanced: UserAdvancedData | null
): number {
  let score = base.suitability_score;
  if (!advanced) return score;

  const soil = advanced.soil_nutrients;
  // pH match bonus/penalty
  if (soil.ph >= 5.5 && soil.ph <= 7.5) score += 5;
  else score -= 10;

  // Nitrogen sufficiency
  if (soil.nitrogen_kg_ha > 100) score += 3;
  if (soil.moisture_percent > 40) score += 2;

  // Weather forecast: rain risk
  const rainDays = advanced.weather_forecast.filter((d) => d.rain_prob > 60).length;
  if (rainDays >= 4) score -= 5;

  // Farm size bonus
  if (user.farmSizeAcres >= 5) score += 4;

  return Math.min(100, Math.max(0, score));
}

// ─── Mock fallback set ────────────────────────────────────────────────────────

async function buildMockRecommendations(
  user: UserProfile,
  advanced: UserAdvancedData | null
): Promise<CropRecommendationResult[]> {
  const scored = EXOTIC_CROP_CATALOG.map((c) => ({
    ...c,
    suitability_score: adjustScore(c, user, advanced),
  })).sort((a, b) => b.suitability_score - a.suitability_score);

  return Promise.all(
    scored.slice(0, 4).map(async (c) => ({
      ...c,
      vendor_matches: await marketLinkageService.getVendorsForCrop(c.crop_name),
    }))
  );
}

// ─── Gemini-powered recommendations ──────────────────────────────────────────

async function generateWithGemini(
  user: UserProfile,
  advanced: UserAdvancedData | null,
  trends: MarketTrend[]
): Promise<CropRecommendationResult[]> {
  if (!ai) return buildMockRecommendations(user, advanced);

  const soilCtx = advanced
    ? `pH=${advanced.soil_nutrients.ph}, N=${advanced.soil_nutrients.nitrogen_kg_ha}kg/ha, P=${advanced.soil_nutrients.phosphorus_kg_ha}kg/ha, K=${advanced.soil_nutrients.potassium_kg_ha}kg/ha, texture=${advanced.soil_nutrients.texture}, moisture=${advanced.soil_nutrients.moisture_percent}%`
    : 'Data not available';

  const weatherCtx = advanced?.weather_forecast
    .slice(0, 7)
    .map((d) => `${d.date}: ${d.temp_max}°C, rain ${d.rain_prob}%`)
    .join(' | ') || 'Data not available';

  const marketCtx =
    trends.length > 0
      ? trends.map((t) => `${t.crop}: ₹${t.modal_price}/qtl (${t.trend}, ${t.demand_level} demand)`).join(', ')
      : 'No current market data';

  const prompt = `
You are an agricultural AI expert. Recommend 3 profitable exotic/high-value crops for an Indian farmer.

## Farmer
- Location: ${user.location.name}
- Current Crop: ${user.primaryCrop}
- Farm Size: ${user.farmSizeAcres} acres
- Irrigation: ${user.irrigationType}
- Soil Type: ${user.soilType}
- Experience: ${user.farmingExperience} years

## Soil Nutrients
${soilCtx}

## 7-Day Weather
${weatherCtx}

## Market Trends
${marketCtx}

Return ONLY a valid JSON array of 3 objects. No markdown:
[
  {
    "id": "unique-id",
    "crop_name": "Dragon Fruit",
    "exotic": true,
    "suitability_score": 85,
    "expected_yield_qtl_acre": 8.0,
    "market_demand": "Very High",
    "risk_level": "Low",
    "estimated_revenue_per_acre": 240000,
    "reasons": ["reason1", "reason2", "reason3"],
    "soil_match": "Suitable for current soil profile",
    "weather_match": "Compatible with short rainfall window",
    "market_match": "High urban demand; rising export interest",
    "grow_duration_days": 365
  }
]
Focus on unique, locally growable, high-value options. Return valid JSON only.`.trim();

  try {
    const resp = await ai.models.generateContent({ model: 'gemini-2.0-flash', contents: prompt });
    const raw = resp.text || '';
    const match = raw.match(/\[[\s\S]*\]/);
    if (!match) throw new Error('No JSON array in Gemini response');

    const parsed: Omit<CropRecommendationResult, 'vendor_matches'>[] = JSON.parse(match[0]);
    return Promise.all(
      parsed.map(async (c) => ({
        ...c,
        vendor_matches: await marketLinkageService.getVendorsForCrop(c.crop_name),
      }))
    );
  } catch (err) {
    console.error('[cropRecommendationService] Gemini error, fallback to mock:', err);
    return buildMockRecommendations(user, advanced);
  }
}

// ─── Public API ───────────────────────────────────────────────────────────────

const CACHE_KEY = (uid: string) => `crop_reco_cache_${uid}`;
const CACHE_TTL = 6 * 60 * 60 * 1000; // 6 hours

export const cropRecommendationService = {
  async getRecommendations(
    user: UserProfile,
    forceRefresh = false
  ): Promise<CropRecommendationResult[]> {
    // Cache check
    if (!forceRefresh) {
      try {
        const cached = JSON.parse(localStorage.getItem(CACHE_KEY(user.uid)) || 'null');
        if (cached && Date.now() - cached.ts < CACHE_TTL) return cached.data;
      } catch { /* ignore */ }
    }

    const [advanced, trends] = await Promise.all([
      firebaseService.getAdvancedData(user.uid),
      firebaseService.getMarketTrends(user.primaryCrop).catch(() => [] as MarketTrend[]),
    ]);

    const recs = await generateWithGemini(user, advanced, trends);
    localStorage.setItem(CACHE_KEY(user.uid), JSON.stringify({ ts: Date.now(), data: recs }));
    return recs;
  },

  /** Vendor match for a specific crop (exposed for MarketLinkage component) */
  async getVendorsForCrop(cropName: string): Promise<VendorBuyer[]> {
    return marketLinkageService.getVendorsForCrop(cropName);
  },
};
