/**
 * SmartAgri+ Advisory Engine — Node.js Backend
 *
 * Server-side port of smartAdvisoryEngine.ts.
 * Accepts a farmer object + user query → returns structured advisory JSON.
 */

import { GoogleGenAI } from '@google/genai';
import dotenv from 'dotenv';
import { buildFarmerContext, buildContextString } from './contextBuilder.js';

dotenv.config();

const MODEL_ID = 'gemini-2.5-flash';
const apiKey = (process.env.GEMINI_API_KEY || '').trim();

const getAi = () => {
  if (!apiKey) return null;
  return new GoogleGenAI({ apiKey });
};

// ─── System Prompt ────────────────────────────────────────────────────────────

const SYSTEM_PROMPT = `
You are SmartAgri+ — an AI-powered, multilingual, farm-specific advisory engine.

Your primary goal is to generate highly accurate, localized, and actionable agricultural recommendations for a specific farmer. You must strictly avoid hallucination and only rely on provided structured data and validated reasoning.

-----------------------------------
🔷 SYSTEM CONTEXT
-----------------------------------

You operate within a real-time AI pipeline with the following data sources:

1. FARMER PROFILE (MongoDB)
- Name, Location (lat, lon, region), Farm size
- Soil type and pH, Crop history
- Current crop and growth stage
- Past disease/pest history, FPO membership

2. REAL-TIME DATA (APIs)
- Weather (OpenWeatherMap), Soil data (SoilGrids)
- Market prices (local + global trends)

3. COMMUNITY DATA
- Nearby farmers pest/disease alerts, Geo-cluster risk signals

-----------------------------------
🔷 PROCESSING PIPELINE (STRICT)
-----------------------------------

Step 1: Understand user intent
Step 2: Retrieve farmer-specific data (provided in CONTEXT)
Step 3: Combine with real-time environmental data (provided in CONTEXT)
Step 4: Check historical patterns (crop + disease)
Step 5: Validate with rule-based constraints
Step 6: Generate advisory
Step 7: Translation handled externally via Bhashini

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

If required data is missing → respond: "Insufficient data. Please provide [missing field]"

-----------------------------------
🔷 OUTPUT FORMAT (STRICT JSON)
-----------------------------------

Return ONLY valid JSON — no markdown fencing, no preamble:

{
  "advisory_text_english": "",
  "advisory_text_regional": "",
  "weekly_plan": {
    "irrigation": "",
    "fertilization": "",
    "pest_control": ""
  },
  "alerts": [""],
  "confidence_score": ""
}

-----------------------------------
🔷 ADVISORY LOGIC
-----------------------------------

1. 🌱 Irrigation Plan — soil moisture + weather forecast
2. 🧪 Fertilization Plan — soil pH + crop stage
3. 🐛 Pest/Disease Risk — weather + past history + community alerts
4. 📅 Harvest Timing — crop stage + weather trends
5. 📈 Market Insight — suggest delay or early harvest if relevant

-----------------------------------
🔷 COMMUNITY SHIELD LOGIC
-----------------------------------

If nearby farmers report pest/disease:
- Add alert + suggest preventive action

-----------------------------------
🔷 FINAL INSTRUCTION
-----------------------------------

Act as a real farm advisor — not a chatbot.
Every answer must feel like: "This is specifically for THIS farmer"
`.trim();

// ─── Q&A System Prompt ────────────────────────────────────────────────────────

const QA_SYSTEM_PROMPT = `
You are SmartAgri+, a farm advisor for Indian farmers (Krishi AI).
Respond ONLY based on the CONTEXT provided. Do NOT hallucinate.
Keep answers short (2-4 sentences), actionable, and personalized to this farmer.
Use simple language a farmer can understand.
If the question is in a regional language, detect it and answer in the same language.
`.trim();

// ─── Safe JSON parser ────────────────────────────────────────────────────────

function safeParseAdvisory(raw) {
  try {
    let cleaned = raw.trim();
    if (cleaned.startsWith('```')) {
      cleaned = cleaned.replace(/^```(?:json)?\s*/i, '').replace(/```\s*$/, '');
    }
    const parsed = JSON.parse(cleaned);
    if (typeof parsed.advisory_text_english === 'string' && parsed.weekly_plan) {
      return parsed;
    }
    return null;
  } catch {
    return null;
  }
}

// ─── Offline Rule-Based Fallback ──────────────────────────────────────────────

function offlineFallback(ctx) {
  const w = ctx.weather;
  const s = ctx.soil;
  const m = ctx.market;
  const f = ctx.farmer;

  let irrigation = 'Water every 3 days.';
  if (w.precipProb > 60) irrigation = 'Rain expected — skip irrigation today.';
  else if (w.temp > 33) irrigation = 'High heat — irrigate in evening hours.';
  else if (s.texture === 'Sandy') irrigation = 'Sandy soil dries fast — irrigate every 2 days.';

  let fertilization = 'Apply balanced NPK fertilizer.';
  if (s.nitrogen === 'Low') fertilization = 'Nitrogen deficient — apply 50kg Urea per acre.';
  else if (s.phosphorus === 'Low') fertilization = 'Low phosphorus — apply DAP or SSP.';
  else if (parseFloat(s.ph) < 6.0) fertilization = 'Acidic soil — apply agricultural lime before fertilizer.';
  else if (parseFloat(s.ph) > 7.5) fertilization = 'Alkaline soil — add organic compost to moderate pH.';

  let pestControl = 'No immediate pest risk. Monitor crops regularly.';
  if (w.humidity > 80 && w.temp > 25) {
    pestControl = 'High fungal risk — apply preventive copper-based fungicide.';
  } else if (w.precipProb > 60) {
    pestControl = 'Post-rain pest surge likely — inspect for leaf miners and aphids.';
  }

  const alerts = [];
  if (m.trend === 'up') alerts.push(`Market trend UP for ${m.crop} — consider holding stock if harvest is near.`);
  else if (m.trend === 'down') alerts.push(`Market price falling for ${m.crop} — sell existing stock early.`);
  if (ctx.communityAlerts.length > 0) alerts.push(...ctx.communityAlerts);

  return {
    advisory_text_english: `${f.name || 'Farmer'}, your ${f.primaryCrop || 'crop'} field in ${f.location?.name || 'your region'} has ${w.condition.toLowerCase()} weather at ${w.temp}°C. Soil pH is ${s.ph} (${s.texture}). ${alerts.length > 0 ? 'Please check the alerts below.' : 'No immediate concerns.'}`,
    advisory_text_regional: '',
    weekly_plan: { irrigation, fertilization, pest_control: pestControl },
    alerts,
    confidence_score: '0.75',
  };
}

// ─── Public API ───────────────────────────────────────────────────────────────

/**
 * Generate a full structured advisory for a farmer.
 * @param {object} farmer — farmer profile from MongoDB or request body
 * @param {string} userQuery — optional natural-language question
 * @returns {Promise<AdvisoryOutput>}
 */
export async function generateAdvisory(farmer, userQuery = '') {
  const ctx = await buildFarmerContext(farmer);
  const contextString = buildContextString(ctx);
  const ai = getAi();

  if (!ai) {
    console.warn('[AdvisoryEngine] No Gemini key — using offline fallback.');
    return offlineFallback(ctx);
  }

  const userContent = [
    'CONTEXT:',
    contextString,
    '',
    `USER QUERY: ${userQuery || 'Give me my weekly farm advisory.'}`,
  ].join('\n');

  try {
    const response = await ai.models.generateContent({
      model: MODEL_ID,
      contents: userContent,
      config: { systemInstruction: SYSTEM_PROMPT },
    });

    const text = response.text || '';
    const advisory = safeParseAdvisory(text);

    if (!advisory) {
      // Gemini returned non-JSON — wrap it gracefully
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

    return advisory;
  } catch (error) {
    console.error('[AdvisoryEngine] Gemini error:', error.message);
    return offlineFallback(ctx);
  }
}

/**
 * Answer a free-text farmer question grounded in real-time context.
 * @param {object} farmer — farmer profile
 * @param {string} question — farmer's question
 * @returns {Promise<string>}
 */
export async function askQuestion(farmer, question) {
  const ai = getAi();
  if (!ai) return 'AI is offline. Please set GEMINI_API_KEY for responses.';

  const ctx = await buildFarmerContext(farmer);
  const contextString = buildContextString(ctx);

  try {
    const response = await ai.models.generateContent({
      model: MODEL_ID,
      contents: `CONTEXT:\n${contextString}\n\nFARMER QUESTION: ${question}`,
      config: { systemInstruction: QA_SYSTEM_PROMPT },
    });

    return response.text?.trim() || "I couldn't process that. Please try again.";
  } catch (error) {
    console.error('[AdvisoryEngine] Q&A error:', error.message);
    return 'Service unavailable. Please try again.';
  }
}
