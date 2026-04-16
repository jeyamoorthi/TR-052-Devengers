/**
 * SmartAgri+ Voice & Chat Assistant — Advisory Context Builder
 *
 * Mirrors the contextString logic from smartAdvisoryEngine.ts but runs
 * server-side in Node.js.  Calls real SoilGrids + OpenWeatherMap APIs
 * when keys are available; otherwise falls back to sensible mock data.
 */

import axios from 'axios';
import dotenv from 'dotenv';
dotenv.config();

const OPENWEATHER_KEY = process.env.OPENWEATHER_API_KEY || '';
const SOILGRIDS_URL = 'https://rest.isric.org/soilgrids/v2.0/properties/query';

// ─── Weather ─────────────────────────────────────────────────────────────────

async function fetchWeather(lat, lng) {
  if (!OPENWEATHER_KEY) return mockWeather(lat, lng);

  try {
    const url = `https://api.openweathermap.org/data/2.5/weather?lat=${lat}&lon=${lng}&units=metric&appid=${OPENWEATHER_KEY}`;
    const { data } = await axios.get(url, { timeout: 6000 });
    return {
      temp: Math.round(data.main.temp),
      humidity: data.main.humidity,
      windSpeed: Math.round((data.wind?.speed || 0) * 3.6),
      precipProb: (data.rain ? 80 : 10),
      condition: data.weather?.[0]?.description || 'Clear',
      source: 'OpenWeatherMap',
    };
  } catch {
    return mockWeather(lat, lng);
  }
}

function mockWeather(lat, lng) {
  // Deterministic mock based on coordinate hash
  const seed = (Math.abs(lat * 100) + Math.abs(lng * 100)) % 50;
  return {
    temp: 28 + Math.round(seed % 10),
    humidity: 65 + Math.round(seed % 20),
    windSpeed: 12 + Math.round(seed % 8),
    precipProb: seed % 2 === 0 ? 30 : 65,
    condition: seed % 3 === 0 ? 'Partly Cloudy' : seed % 3 === 1 ? 'Clear' : 'Light Rain',
    source: 'mock',
  };
}

// ─── Soil ─────────────────────────────────────────────────────────────────────

async function fetchSoil(lat, lng) {
  try {
    const url = `${SOILGRIDS_URL}?lat=${lat}&lon=${lng}&property=phh2o,nitrogen,soc,clay,sand,silt&depth=0-5cm&value=mean`;
    const { data } = await axios.get(url, { timeout: 8000 });
    const props = data?.properties?.layers || [];

    const get = (name) => {
      const layer = props.find((p) => p.name === name);
      return layer?.depths?.[0]?.values?.mean ?? null;
    };

    const ph = get('phh2o') != null ? (get('phh2o') / 10).toFixed(1) : '6.5';
    const nitrogen = get('nitrogen') != null ? (get('nitrogen') > 1500 ? 'High' : get('nitrogen') > 800 ? 'Medium' : 'Low') : 'Medium';
    const organicCarbon = get('soc') != null ? (get('soc') > 20 ? 'High' : get('soc') > 10 ? 'Medium' : 'Low') : 'Medium';
    const sand = get('sand');
    const clay = get('clay');
    const texture = sand != null && clay != null
      ? (sand > 700 ? 'Sandy' : clay > 350 ? 'Clay' : 'Loamy')
      : 'Loamy';

    return { ph, nitrogen, phosphorus: 'Medium', potassium: 'Medium', organicCarbon, texture, source: 'SoilGrids', confidence: 'Estimate' };
  } catch {
    return mockSoil();
  }
}

function mockSoil() {
  return {
    ph: '6.5',
    texture: 'Loamy',
    organicCarbon: 'Medium',
    nitrogen: 'Medium',
    phosphorus: 'Medium',
    potassium: 'Medium',
    source: 'mock',
    confidence: 'Estimate',
  };
}

// ─── Market ───────────────────────────────────────────────────────────────────

function getMarketData(crop) {
  const prices = {
    Rice: { price: 2200, trend: 'stable', difference: 50 },
    Wheat: { price: 2150, trend: 'up', difference: 120 },
    Maize: { price: 1850, trend: 'down', difference: -80 },
    Cotton: { price: 6800, trend: 'up', difference: 300 },
    Sugarcane: { price: 315, trend: 'stable', difference: 5 },
    Paddy: { price: 2100, trend: 'up', difference: 100 },
    Turmeric: { price: 9500, trend: 'up', difference: 450 },
    Banana: { price: 1400, trend: 'stable', difference: 0 },
    Groundnut: { price: 5200, trend: 'down', difference: -200 },
  };
  const entry = prices[crop] || { price: 2000, trend: 'stable', difference: 0 };
  return { crop: crop || 'Rice', unit: 'quintal', ...entry };
}

// ─── Context Builder ──────────────────────────────────────────────────────────

export async function buildFarmerContext(farmer) {
  const [weather, soil] = await Promise.all([
    fetchWeather(farmer.location?.lat || 11.0, farmer.location?.lng || 78.0),
    fetchSoil(farmer.location?.lat || 11.0, farmer.location?.lng || 78.0),
  ]);
  const market = getMarketData(farmer.primaryCrop || 'Rice');

  const communityAlerts = [];
  if (weather.humidity > 80 && weather.temp > 25) {
    communityAlerts.push(
      `[Community Shield] High fungal disease risk in ${farmer.location?.name || 'your region'}. Nearby farmers have reported Blight symptoms.`
    );
  }

  return {
    farmer,
    weather,
    soil,
    market,
    communityAlerts,
  };
}

export function buildContextString(ctx) {
  const f = ctx.farmer;
  const w = ctx.weather;
  const s = ctx.soil;
  const m = ctx.market;

  const lines = [
    '=== FARMER PROFILE ===',
    `Name: ${f.name || 'Unknown'}`,
    `Location: ${f.location?.name || 'Unknown'}, ${f.location?.district || ''}, ${f.location?.state || ''}`,
    `Coordinates: (${f.location?.lat || 0}, ${f.location?.lng || 0})`,
    `Farm Size: ${f.farmSizeAcres || 2} acres`,
    `Primary Crop: ${f.primaryCrop || 'Rice'}`,
    `Soil Type (profile): ${f.soilType || 'Loamy'}`,
    `Irrigation: ${f.irrigationType || 'Rainfed'}`,
    `Experience: ${f.farmingExperience || 0} years`,
    `FPO Member: ${f.isFpoMember ? 'Yes' : 'No'}`,
    f.sowingDate ? `Sowing Date: ${f.sowingDate}` : '',
    f.present_crop_stage ? `Crop Stage: ${f.present_crop_stage}` : '',
    f.past_crop ? `Past Crop: ${f.past_crop}` : '',
    f.past_plant_disease?.length ? `Past Diseases: ${f.past_plant_disease.join(', ')}` : '',

    '',
    '=== REAL-TIME WEATHER ===',
    `Temperature: ${w.temp}°C`,
    `Humidity: ${w.humidity}%`,
    `Wind Speed: ${w.windSpeed} km/h`,
    `Precipitation Probability: ${w.precipProb}%`,
    `Condition: ${w.condition}`,
    `Data Source: ${w.source}`,

    '',
    '=== SOIL DATA ===',
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
    ctx.communityAlerts.length > 0
      ? ctx.communityAlerts.join('\n')
      : 'No active community alerts in this region.',
  ];

  return lines.filter(Boolean).join('\n');
}
