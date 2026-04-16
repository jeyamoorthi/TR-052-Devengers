import { GoogleGenAI } from '@google/genai';
import { UserProfile, WeatherData, SoilData, MarketData, Language } from '../types';
import { weatherService } from './weatherService';
import { soilService } from './soilService';
import { marketService } from './marketService';
import { bhashiniService } from './bhashiniService';

/**
 * SmartAgri+ Advisory Engine
 *
 * Combines real-time farmer data, weather, soil, market, and community signals
 * into a single Gemini prompt that follows a strict processing pipeline.
 *
 * Output is structured JSON as defined in the system prompt.
 */

const modelId = 'gemini-2.5-flash';
const apiKey = (import.meta.env.VITE_GEMINI_API_KEY || '').trim();

const getAi = () => {
  if (!apiKey) return null;
  return new GoogleGenAI({ apiKey });
};

// ---------------------------------------------------------------------------
// Advisory output shape
// ---------------------------------------------------------------------------
export interface AdvisoryOutput {
  advisory_text_english: string;
  advisory_text_regional: string;
  weekly_plan: {
    irrigation: string;
    fertilization: string;
    pest_control: string;
  };
  alerts: string[];
  confidence_score: string;
}

// ---------------------------------------------------------------------------
// Assembled context snapshot — everything the LLM is allowed to reference
// ---------------------------------------------------------------------------
interface FarmerContext {
  farmer: {
    name: string;
    location: string;
    lat: number;
    lng: number;
    farmSizeAcres: number;
    soilType: string;
    primaryCrop: string;
    irrigationType: string;
    farmingExperience: number;
    isFpoMember: boolean;
    sowingDate?: string;
  };
  weather: WeatherData;
  soil: SoilData;
  market: MarketData;
  communityAlerts: string[];
}

// ---------------------------------------------------------------------------
// System prompt — the full SmartAgri+ advisory persona
// ---------------------------------------------------------------------------
const SYSTEM_PROMPT = `
You are SmartAgri+ — an AI-powered, multilingual, farm-specific advisory engine.

Your primary goal is to generate highly accurate, localized, and actionable agricultural recommendations for a specific farmer. You must strictly avoid hallucination and only rely on provided structured data and validated reasoning.

-----------------------------------
🔷 SYSTEM CONTEXT
-----------------------------------

You operate within a real-time AI pipeline with the following data sources:

1. FARMER PROFILE (MongoDB)
- Name
- Location (lat, lon, region)
- Farm size
- Soil type and pH
- Crop history
- Current crop and growth stage
- Past disease/pest history
- Investment and loss data
- FPO membership

2. REAL-TIME DATA (APIs)
- Weather (OpenWeatherMap)
- Soil data (SoilGrids / sensors)
- Market prices (local + global trends)
- AQI (optional environmental factor)

3. USER INPUT
- Natural language query (text or voice converted via Bhashini)

4. COMMUNITY DATA
- Nearby farmers pest/disease alerts
- Geo-cluster risk signals

-----------------------------------
🔷 PROCESSING PIPELINE (STRICT)
-----------------------------------

You MUST follow this sequence:

Step 1: Understand user intent  
Step 2: Retrieve relevant farmer-specific data (provided in CONTEXT)
Step 3: Combine with real-time environmental data (provided in CONTEXT)
Step 4: Check historical patterns (crop + disease)  
Step 5: Validate with rule-based constraints  
Step 6: Generate advisory  
Step 7: Translate into regional language (if required — handled externally)

-----------------------------------
🔷 RULES (CRITICAL)
-----------------------------------

1. ❌ DO NOT hallucinate data  
2. ❌ DO NOT assume missing values  
3. ❌ DO NOT give generic advice  
4. ✅ ALWAYS personalize to farmer profile  
5. ✅ ALWAYS consider location-specific weather  
6. ✅ ALWAYS include actionable steps  
7. ✅ ALWAYS keep response practical for farmers  

If required data is missing:
→ Respond: "Insufficient data. Please provide [missing field]"

-----------------------------------
🔷 OUTPUT FORMAT (STRICT JSON)
-----------------------------------

Return ONLY in this format:

{
  "advisory_text_english": "",
  "advisory_text_regional": "",
  "weekly_plan": {
    "irrigation": "",
    "fertilization": "",
    "pest_control": ""
  },
  "alerts": [
    ""
  ],
  "confidence_score": ""
}

-----------------------------------
🔷 ADVISORY LOGIC
-----------------------------------

You must include:

1. 🌱 Irrigation Plan
- Based on soil moisture + weather forecast

2. 🧪 Fertilization Plan
- Based on soil pH + crop stage

3. 🐛 Pest/Disease Risk
- Based on:
  - Weather
  - Past disease history
  - Community alerts

4. 📅 Harvest Timing
- Based on crop stage + weather trends

5. 📈 Market Insight (if relevant)
- Suggest delay or early harvest

-----------------------------------
🔷 COMMUNITY SHIELD LOGIC
-----------------------------------

If nearby farmers report pest/disease:
- Add alert
- Suggest preventive action

-----------------------------------
🔷 MULTILINGUAL LOGIC
-----------------------------------

If user language ≠ English:
- Translate output using Bhashini
- Maintain meaning accuracy

-----------------------------------
🔷 LATENCY OPTIMIZATION AWARENESS
-----------------------------------

- Prefer concise reasoning
- Avoid unnecessary explanation
- Prioritize fast response (<5 sec)

-----------------------------------
🔷 FINAL INSTRUCTION
-----------------------------------

Act as a real farm advisor — not a chatbot.

Every answer must feel like:
👉 "This is specifically for THIS farmer"
`.trim();

// ---------------------------------------------------------------------------
// Build the full context string from all data sources
// ---------------------------------------------------------------------------
function buildContextString(ctx: FarmerContext): string {
  const f = ctx.farmer;
  const w = ctx.weather;
  const s = ctx.soil;
  const m = ctx.market;

  const lines: string[] = [
    '=== FARMER PROFILE ===',
    `Name: ${f.name}`,
    `Location: ${f.location} (${f.lat}, ${f.lng})`,
    `Farm Size: ${f.farmSizeAcres} acres`,
    `Primary Crop: ${f.primaryCrop}`,
    `Soil Type (profile): ${f.soilType}`,
    `Irrigation: ${f.irrigationType}`,
    `Experience: ${f.farmingExperience} years`,
    `FPO Member: ${f.isFpoMember ? 'Yes' : 'No'}`,
    f.sowingDate ? `Sowing Date: ${f.sowingDate}` : '',

    '',
    '=== REAL-TIME WEATHER ===',
    `Temperature: ${w.temp}°C`,
    `Humidity: ${w.humidity}%`,
    `Wind Speed: ${w.windSpeed} km/h`,
    `Precipitation Probability: ${w.precipProb}%`,
    `Condition: ${w.condition}`,
    `Alerts: ${w.alerts.length > 0 ? w.alerts.map(a => `${a.type}(${a.severity}): ${a.message[Language.EN]}`).join('; ') : 'None'}`,
    `7-Day Forecast: ${w.forecast.map(d => `${d.day} ${d.temp}°C ${d.condition} rain:${d.rainfall}mm`).join(' | ')}`,

    '',
    '=== SOIL DATA (SoilGrids) ===',
    `pH: ${s.ph}`,
    `Texture: ${s.texture}`,
    `Organic Carbon: ${s.organicCarbon}`,
    `Nitrogen: ${s.nitrogen}`,
    `Phosphorus: ${s.phosphorus}`,
    `Potassium: ${s.potassium}`,
    `Source: ${s.source} (${s.confidence})`,

    '',
    '=== MARKET DATA ===',
    `Crop: ${m.crop}`,
    `Price: ₹${m.price}/${m.unit}`,
    `Trend: ${m.trend} (Δ${m.difference})`,

    '',
    '=== COMMUNITY ALERTS ===',
    ctx.communityAlerts.length > 0 ? ctx.communityAlerts.join('\n') : 'No active community alerts in this region.',
  ];

  return lines.filter(Boolean).join('\n');
}

// ---------------------------------------------------------------------------
// Gather all data for a user into a FarmerContext
// ---------------------------------------------------------------------------
function gatherContext(user: UserProfile): FarmerContext {
  const weather = weatherService.getWeather(user.location.lat, user.location.lng);
  const soil = soilService.getSoilData(user.location.lat, user.location.lng);
  const market = marketService.getMarketData(user.primaryCrop || 'Rice');

  // Community alerts — in production these would come from Firebase/geo-cluster
  const communityAlerts: string[] = [];
  if (weather.alerts.some(a => a.type === 'Disease' && a.severity === 'High')) {
    communityAlerts.push(
      `[Community Shield] High fungal disease risk detected in ${user.location.district || user.location.name} region. Nearby farmers have reported Blight symptoms.`,
    );
  }

  return {
    farmer: {
      name: user.name,
      location: `${user.location.name}, ${user.location.district || ''}, ${user.location.state}`,
      lat: user.location.lat,
      lng: user.location.lng,
      farmSizeAcres: user.farmSizeAcres || 2,
      soilType: user.soilType || 'Unknown',
      primaryCrop: user.primaryCrop || 'Unknown',
      irrigationType: user.irrigationType || 'Rainfed',
      farmingExperience: user.farmingExperience || 0,
      isFpoMember: user.isFpoMember || false,
      sowingDate: user.sowingDate,
    },
    weather,
    soil,
    market,
    communityAlerts,
  };
}

// ---------------------------------------------------------------------------
// Safe JSON parse with fallback
// ---------------------------------------------------------------------------
function safeParseAdvisory(raw: string): AdvisoryOutput | null {
  try {
    // Strip markdown fences if model accidentally adds them
    let cleaned = raw.trim();
    if (cleaned.startsWith('```')) {
      cleaned = cleaned.replace(/^```(?:json)?\s*/i, '').replace(/```\s*$/, '');
    }
    const parsed = JSON.parse(cleaned);
    // Validate required fields
    if (typeof parsed.advisory_text_english === 'string' && parsed.weekly_plan) {
      return parsed as AdvisoryOutput;
    }
    return null;
  } catch {
    return null;
  }
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------
export const smartAdvisoryEngine = {
  /**
   * Generate a full, personalized advisory for the given farmer and optional query.
   * If the user's language is not English, the advisory_text_regional field is
   * translated via Bhashini NMT.
   */
  async generateAdvisory(
    user: UserProfile,
    userQuery: string,
    language: Language,
  ): Promise<AdvisoryOutput> {
    const ai = getAi();

    // 1. Gather all contextual data
    const ctx = gatherContext(user);
    const contextString = buildContextString(ctx);

    // 2. If no AI key, return a rule-based offline fallback
    if (!ai) {
      return this.offlineFallback(ctx, language);
    }

    // 3. Build the prompt
    const userContent = [
      'CONTEXT:',
      contextString,
      '',
      `USER QUERY: ${userQuery || 'Give me my weekly farm advisory.'}`,
    ].join('\n');

    try {
      const response = await ai.models.generateContent({
        model: modelId,
        contents: userContent,
        config: {
          systemInstruction: SYSTEM_PROMPT,
        },
      });

      const text = response.text || '';
      const advisory = safeParseAdvisory(text);

      if (!advisory) {
        // If Gemini returns non-JSON, wrap it into the expected shape
        return {
          advisory_text_english: text.slice(0, 500),
          advisory_text_regional: '',
          weekly_plan: {
            irrigation: 'Check local conditions.',
            fertilization: 'Follow soil test recommendations.',
            pest_control: 'Monitor crops daily.',
          },
          alerts: [],
          confidence_score: '0.5',
        };
      }

      // 4. Translate advisory to regional language via Bhashini
      if (language !== Language.EN && bhashiniService.isAvailable()) {
        try {
          advisory.advisory_text_regional = await bhashiniService.translateFromEnglish(
            advisory.advisory_text_english,
            language,
          );
        } catch {
          // Bhashini failure is non-critical
          advisory.advisory_text_regional = advisory.advisory_text_english;
        }
      }

      return advisory;
    } catch (error) {
      console.error('[SmartAdvisoryEngine] Gemini error:', error);
      return this.offlineFallback(ctx, language);
    }
  },

  /**
   * Quick context-grounded Q&A using the same persona but allowing free-text response.
   */
  async askQuestion(
    user: UserProfile,
    question: string,
    language: Language,
  ): Promise<string> {
    const ai = getAi();
    if (!ai) return 'AI is offline. Please set VITE_GEMINI_API_KEY for responses.';

    const ctx = gatherContext(user);
    const contextString = buildContextString(ctx);

    // For Q&A we allow natural language (not strictly JSON)
    const qaSystemPrompt = `
You are SmartAgri+, a farm advisor.
Respond ONLY based on the CONTEXT provided. Do NOT hallucinate.
Keep answers short (2-4 sentences), actionable, and personalized to this farmer.
Language: ${language}
    `.trim();

    try {
      const response = await ai.models.generateContent({
        model: modelId,
        contents: `CONTEXT:\n${contextString}\n\nFARMER QUESTION: ${question}`,
        config: { systemInstruction: qaSystemPrompt },
      });

      let answer = response.text || "I couldn't process that.";

      // Translate if needed
      if (language !== Language.EN && bhashiniService.isAvailable()) {
        try {
          answer = await bhashiniService.translateFromEnglish(answer, language);
        } catch { /* non-critical */ }
      }

      return answer;
    } catch (error) {
      console.error('[SmartAdvisoryEngine] Q&A error:', error);
      return 'Service unavailable. Please try again.';
    }
  },

  /**
   * Rule-based offline fallback when Gemini key is missing or fails.
   */
  offlineFallback(ctx: FarmerContext, _language: Language): AdvisoryOutput {
    const w = ctx.weather;
    const s = ctx.soil;
    const m = ctx.market;
    const f = ctx.farmer;

    // Irrigation logic
    let irrigation = 'Water every 3 days.';
    if (w.precipProb > 60) irrigation = 'Rain expected — skip irrigation today.';
    else if (w.temp > 33) irrigation = 'High heat — irrigate in evening hours.';
    else if (s.texture === 'Sandy') irrigation = 'Sandy soil dries fast — irrigate every 2 days.';

    // Fertilization logic
    let fertilization = 'Apply balanced NPK fertilizer.';
    if (s.nitrogen === 'Low') fertilization = 'Nitrogen deficient — apply 50kg Urea per acre.';
    else if (s.phosphorus === 'Low') fertilization = 'Low phosphorus — apply DAP or SSP.';
    else if (s.ph < 6.0) fertilization = 'Acidic soil — apply agricultural lime before fertilizer.';
    else if (s.ph > 7.5) fertilization = 'Alkaline soil — add organic compost to moderate pH.';

    // Pest control logic
    let pestControl = 'No immediate pest risk. Monitor crops regularly.';
    if (w.humidity > 80 && w.temp > 25) {
      pestControl = 'High fungal risk — apply preventive copper-based fungicide.';
    } else if (w.precipProb > 60) {
      pestControl = 'Post-rain pest surge likely — inspect for leaf miners and aphids.';
    }

    const alerts: string[] = [];
    w.alerts.forEach(a => alerts.push(`${a.type}: ${a.message[Language.EN]}`));

    if (m.trend === 'up') {
      alerts.push(`Market trend UP for ${m.crop} — consider holding stock if harvest is near.`);
    } else if (m.trend === 'down') {
      alerts.push(`Market price falling for ${m.crop} — sell existing stock early.`);
    }

    if (ctx.communityAlerts.length > 0) {
      alerts.push(...ctx.communityAlerts);
    }

    return {
      advisory_text_english: `${f.name}, your ${f.primaryCrop} field in ${f.location} currently has ${w.condition.toLowerCase()} weather at ${w.temp}°C. Soil pH is ${s.ph} (${s.texture}). ${alerts.length > 0 ? 'Please check the alerts below.' : 'No immediate concerns.'}`,
      advisory_text_regional: '',
      weekly_plan: { irrigation, fertilization, pest_control: pestControl },
      alerts,
      confidence_score: '0.75',
    };
  },
};
