/**
 * weeklyAdvisoryService.ts
 * ─────────────────────────────────────────────────────────────────────────────
 * AI-powered weekly farm advisory engine.
 * Generates: irrigation schedule, pest risk alerts, harvest planning.
 * Uses Gemini AI (via VITE_GEMINI_API_KEY) with structured JSON output.
 * Stores results in advisory_logs collection.
 */

import { GoogleGenAI } from '@google/genai';
import {
  AdvisoryLog,
  IrrigationSlot,
  PestRiskAlert,
  HarvestPlan,
  UserProfile,
  UserAdvancedData,
  MarketTrend,
} from '../types';
import { firebaseService } from './firebaseService';

const AI_KEY = (import.meta.env.VITE_GEMINI_API_KEY as string | undefined) || '';
const ai = AI_KEY ? new GoogleGenAI({ apiKey: AI_KEY }) : null;

// ─── Helpers ─────────────────────────────────────────────────────────────────

function getMonday(date: Date): string {
  const d = new Date(date);
  const day = d.getDay();
  d.setDate(d.getDate() - ((day + 6) % 7));
  return d.toISOString().split('T')[0];
}

function isoDate(daysFromNow: number): string {
  return new Date(Date.now() + daysFromNow * 86400000).toISOString().split('T')[0];
}

const DAYS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];

// ─── Mock fallback plan ───────────────────────────────────────────────────────

function buildMockPlan(user: UserProfile, weekStart: string): AdvisoryLog {
  const irrigation: IrrigationSlot[] = DAYS.filter((_, i) => i % 2 === 0).map((day, i) => ({
    day,
    date: isoDate(i * 2),
    time: '06:30',
    duration_minutes: user.farmSizeAcres > 3 ? 60 : 40,
    method: user.irrigationType === 'Drip' ? 'Drip Irrigation' : 'Sprinkler',
    reminder_sent: false,
  }));

  const pestAlerts: PestRiskAlert[] = [
    {
      pest: 'Aphid',
      risk_level: 'Medium',
      affected_crop: user.primaryCrop || 'Current crop',
      action: 'Apply neem oil spray in early morning. Monitor leaf undersides daily.',
    },
    {
      pest: 'Leaf Blight',
      risk_level: 'Low',
      affected_crop: user.primaryCrop || 'Current crop',
      action: 'Ensure proper spacing for air circulation. Avoid overhead irrigation.',
    },
  ];

  const harvestPlan: HarvestPlan = {
    estimated_harvest_date: isoDate(45),
    expected_yield_qtl: parseFloat((user.farmSizeAcres * 18).toFixed(1)),
    quality_forecast: 'High',
    market_timing_advice:
      'Market prices are expected to rise in the next 3 weeks. Consider holding stocks for 2 weeks post-harvest.',
    post_harvest_tips: [
      'Dry produce to optimal moisture before storage',
      'Use hermetic bags to prevent pest infestation',
      'Contact local FPO for collective sale at better price',
    ],
  };

  return {
    id: `advisory_${user.uid}_${weekStart}`,
    uid: user.uid,
    week_start: weekStart,
    irrigation_schedule: irrigation,
    pest_risk_alerts: pestAlerts,
    harvest_plan: harvestPlan,
    raw_ai_response: 'Mock advisory (Gemini unavailable)',
    created_at: Date.now(),
  };
}

// ─── Gemini-powered plan ──────────────────────────────────────────────────────

async function generateWithGemini(
  user: UserProfile,
  advanced: UserAdvancedData | null,
  trends: MarketTrend[],
  weekStart: string
): Promise<AdvisoryLog> {
  if (!ai) return buildMockPlan(user, weekStart);

  const soilSummary = advanced
    ? `pH ${advanced.soil_nutrients.ph}, N=${advanced.soil_nutrients.nitrogen_kg_ha}kg/ha, P=${advanced.soil_nutrients.phosphorus_kg_ha}kg/ha, K=${advanced.soil_nutrients.potassium_kg_ha}kg/ha, Moisture=${advanced.soil_nutrients.moisture_percent}%, Texture=${advanced.soil_nutrients.texture}`
    : 'Not available';

  const forecastSummary = advanced?.weather_forecast
    .slice(0, 7)
    .map(
      (d) =>
        `${d.date}: max=${d.temp_max}°C, rain_prob=${d.rain_prob}%, rainfall=${d.rainfall_mm}mm`
    )
    .join('\n') || 'Not available';

  const marketSummary =
    trends.length > 0
      ? trends
          .slice(0, 5)
          .map((t) => `${t.crop}: ₹${t.modal_price}/qtl (${t.trend})`)
          .join(', ')
      : 'No market data';

  const prompt = `
You are an expert agricultural advisory AI for Indian farmers. Generate a structured weekly farm advisory in valid JSON only.

## Farmer Context
- Name: ${user.name}
- Location: ${user.location.name} (lat: ${user.location.lat}, lon: ${user.location.lng})
- Primary Crop: ${user.primaryCrop}
- Farm Size: ${user.farmSizeAcres} acres
- Irrigation Type: ${user.irrigationType}
- Soil Type: ${user.soilType}
- Farming Experience: ${user.farmingExperience} years

## Soil Data
${soilSummary}

## 7-Day Weather Forecast
${forecastSummary}

## Market Trends
${marketSummary}

## Week Starting
${weekStart}

## Output Format (return ONLY valid JSON, no markdown):
{
  "irrigation_schedule": [
    {
      "day": "Monday",
      "date": "YYYY-MM-DD",
      "time": "HH:MM",
      "duration_minutes": 45,
      "method": "Drip Irrigation",
      "reminder_sent": false
    }
  ],
  "pest_risk_alerts": [
    {
      "pest": "Aphid",
      "risk_level": "Medium",
      "affected_crop": "Rice",
      "action": "Apply neem oil in early morning"
    }
  ],
  "harvest_plan": {
    "estimated_harvest_date": "YYYY-MM-DD",
    "expected_yield_qtl": 45.0,
    "quality_forecast": "High",
    "market_timing_advice": "string",
    "post_harvest_tips": ["tip1", "tip2", "tip3"]
  }
}

Generate a practical, weather-aware, soil-specific plan. Include 3-4 irrigation slots across the week. Include 2-3 pest alerts. Base harvest timing on crop type.`.trim();

  try {
    const response = await ai.models.generateContent({
      model: 'gemini-2.0-flash',
      contents: prompt,
    });

    const raw = response.text || '';
    // Extract JSON from response
    const jsonMatch = raw.match(/\{[\s\S]*\}/);
    if (!jsonMatch) throw new Error('No JSON found in Gemini response');

    const parsed = JSON.parse(jsonMatch[0]);

    return {
      id: `advisory_${user.uid}_${weekStart}`,
      uid: user.uid,
      week_start: weekStart,
      irrigation_schedule: (parsed.irrigation_schedule || []).map((s: IrrigationSlot) => ({
        ...s,
        reminder_sent: false,
      })),
      pest_risk_alerts: parsed.pest_risk_alerts || [],
      harvest_plan: parsed.harvest_plan || buildMockPlan(user, weekStart).harvest_plan,
      raw_ai_response: raw,
      created_at: Date.now(),
    };
  } catch (err) {
    console.error('[weeklyAdvisoryService] Gemini error, falling back to mock:', err);
    return buildMockPlan(user, weekStart);
  }
}

// ─── Public API ───────────────────────────────────────────────────────────────

export const weeklyAdvisoryService = {
  /**
   * Generate (or return cached) weekly advisory for the current week.
   * Force-regenerates if `forceRefresh=true`.
   */
  async getWeeklyAdvisory(
    user: UserProfile,
    forceRefresh = false
  ): Promise<AdvisoryLog> {
    const weekStart = getMonday(new Date());

    if (!forceRefresh) {
      const cached = await firebaseService.getLatestAdvisoryLog(user.uid);
      if (cached && cached.week_start === weekStart) return cached;
    }

    const [advanced, trends] = await Promise.all([
      firebaseService.getAdvancedData(user.uid),
      firebaseService.getMarketTrends(user.primaryCrop).catch(() => []),
    ]);

    const advisory = await generateWithGemini(user, advanced, trends, weekStart);
    await firebaseService.saveAdvisoryLog(advisory);
    return advisory;
  },

  /** Mark an irrigation slot's reminder as sent */
  async markReminderSent(uid: string, advisoryId: string, slotDate: string): Promise<void> {
    const log = await firebaseService.getLatestAdvisoryLog(uid);
    if (!log || log.id !== advisoryId) return;
    log.irrigation_schedule = log.irrigation_schedule.map((s) =>
      s.date === slotDate ? { ...s, reminder_sent: true } : s
    );
    await firebaseService.saveAdvisoryLog(log);
  },

  /** Get all past advisory logs for a user */
  async getAdvisoryHistory(uid: string): Promise<AdvisoryLog[]> {
    return firebaseService.getAdvisoryLogs(uid);
  },
};
