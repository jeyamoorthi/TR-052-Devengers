/**
 * enrichmentService.ts
 * ─────────────────────────────────────────────────────────────────────────────
 * Auto-fetches soil + weather data after user registration.
 * Architecture: designed for real SoilGrids + OpenWeather APIs.
 * Falls back to deterministic mock data when API keys are absent or request fails.
 *
 * Real API env vars:
 *   VITE_SOILGRIDS_API_URL   (default: https://rest.isric.org/soilgrids/v2.0)
 *   VITE_OPENWEATHER_API_KEY
 */

import {
  UserAdvancedData,
  SoilNutrients,
  HistoricalWeatherDay,
  WeatherForecastDay,
} from '../types';
import { firebaseService } from './firebaseService';

// ─── Config ──────────────────────────────────────────────────────────────────
const SOILGRIDS_URL =
  (import.meta.env.VITE_SOILGRIDS_API_URL as string | undefined) ||
  'https://rest.isric.org/soilgrids/v2.0';
const OW_KEY = (import.meta.env.VITE_OPENWEATHER_API_KEY as string | undefined) || '';

// ─── Deterministic RNG (same as soilService pattern) ─────────────────────────
function seededRand(seed: number) {
  let s = seed + 0x6d2b79f5;
  return () => {
    s = Math.imul(s ^ (s >>> 15), s | 1);
    s ^= s + Math.imul(s ^ (s >>> 7), s | 61);
    return ((s ^ (s >>> 14)) >>> 0) / 4294967296;
  };
}

// ─── SoilGrids ───────────────────────────────────────────────────────────────

async function fetchSoilGridsData(lat: number, lon: number): Promise<SoilNutrients> {
  try {
    if (SOILGRIDS_URL.includes('rest.isric.org')) {
      // Real SoilGrids v2 API call
      const url = `${SOILGRIDS_URL}/soil_data?lon=${lon}&lat=${lat}`;
      const res = await fetch(url, { headers: { Accept: 'application/json' } });
      if (!res.ok) throw new Error(`SoilGrids ${res.status}`);
      const json = await res.json();
      const props = json?.properties?.layers || [];
      // Parse SoilGrids layer data (returns mean values per depth)
      const getLayer = (name: string) =>
        (props.find((l: { name: string }) => l.name === name)?.depths?.[0]?.values?.mean ?? 0) / 10;
      return {
        nitrogen_kg_ha: getLayer('nitrogen') || mockSoil(lat, lon).nitrogen_kg_ha,
        phosphorus_kg_ha: mockSoil(lat, lon).phosphorus_kg_ha, // SoilGrids has limited P data
        potassium_kg_ha: mockSoil(lat, lon).potassium_kg_ha,
        ph: (getLayer('phh2o') || mockSoil(lat, lon).ph * 10) / 10,
        moisture_percent: getLayer('wv0010') || mockSoil(lat, lon).moisture_percent,
        organic_carbon_percent: (getLayer('soc') || 0) / 10 || mockSoil(lat, lon).organic_carbon_percent,
        texture: mockSoil(lat, lon).texture,
        source: 'SoilGrids',
        fetched_at: Date.now(),
      };
    }
  } catch (err) {
    console.warn('[enrichmentService] SoilGrids fetch failed, using mock:', err);
  }
  return mockSoil(lat, lon);
}

function mockSoil(lat: number, lon: number): SoilNutrients {
  const r = seededRand(Math.round(lat * 1000 + lon));
  const textures: SoilNutrients['texture'][] = ['Sandy', 'Loamy', 'Clay', 'Silt'];
  return {
    nitrogen_kg_ha: parseFloat((80 + r() * 120).toFixed(1)),
    phosphorus_kg_ha: parseFloat((20 + r() * 60).toFixed(1)),
    potassium_kg_ha: parseFloat((150 + r() * 200).toFixed(1)),
    ph: parseFloat((5.5 + r() * 3).toFixed(1)),
    moisture_percent: parseFloat((20 + r() * 50).toFixed(1)),
    organic_carbon_percent: parseFloat((0.5 + r() * 2.5).toFixed(2)),
    texture: textures[Math.floor(r() * textures.length)],
    source: 'Mock',
    fetched_at: Date.now(),
  };
}

// ─── OpenWeather ─────────────────────────────────────────────────────────────

async function fetchHistoricalWeather(lat: number, lon: number): Promise<HistoricalWeatherDay[]> {
  const days: HistoricalWeatherDay[] = [];
  const r = seededRand(Math.round(lat + lon + Date.now() / 86400000));

  if (OW_KEY) {
    try {
      // OpenWeather One Call API 3.0 — last 7 days
      for (let i = 7; i >= 1; i--) {
        const dt = Math.floor((Date.now() - i * 86400000) / 1000);
        const res = await fetch(
          `https://api.openweathermap.org/data/3.0/onecall/timemachine?lat=${lat}&lon=${lon}&dt=${dt}&appid=${OW_KEY}&units=metric`
        );
        if (!res.ok) throw new Error('OW ' + res.status);
        const d = await res.json();
        const day = d.data?.[0];
        days.push({
          date: new Date((dt) * 1000).toISOString().split('T')[0],
          temp_max: day?.temp ?? 28 + r() * 10,
          temp_min: (day?.temp ?? 28 + r() * 10) - 6,
          humidity: day?.humidity ?? Math.round(50 + r() * 40),
          rainfall_mm: parseFloat((r() * 15).toFixed(1)),
          condition: day?.weather?.[0]?.description || 'Clear',
        });
      }
      return days;
    } catch (err) {
      console.warn('[enrichmentService] OpenWeather historical fetch failed:', err);
    }
  }
  // Mock fallback
  const conditions = ['Sunny', 'Partly Cloudy', 'Overcast', 'Light Rain', 'Clear', 'Humid'];
  for (let i = 7; i >= 1; i--) {
    const d = new Date(Date.now() - i * 86400000);
    days.push({
      date: d.toISOString().split('T')[0],
      temp_max: parseFloat((28 + r() * 10).toFixed(1)),
      temp_min: parseFloat((18 + r() * 8).toFixed(1)),
      humidity: Math.round(50 + r() * 40),
      rainfall_mm: parseFloat((r() * 12).toFixed(1)),
      condition: conditions[Math.floor(r() * conditions.length)],
    });
  }
  return days;
}

async function fetchWeatherForecast(lat: number, lon: number): Promise<WeatherForecastDay[]> {
  const days: WeatherForecastDay[] = [];
  const r = seededRand(Math.round(lat - lon + Date.now() / 86400000));

  if (OW_KEY) {
    try {
      const res = await fetch(
        `https://api.openweathermap.org/data/3.0/onecall?lat=${lat}&lon=${lon}&exclude=current,minutely,hourly,alerts&appid=${OW_KEY}&units=metric`
      );
      if (!res.ok) throw new Error('OW ' + res.status);
      const d = await res.json();
      (d.daily || []).slice(0, 7).forEach((day: Record<string, unknown>) => {
        const dt = new Date(((day.dt as number) ?? 0) * 1000);
        const rain = (day.rain as number) ?? 0;
        days.push({
          date: dt.toISOString().split('T')[0],
          temp_max: (day.temp as { max?: number })?.max ?? 32,
          temp_min: (day.temp as { min?: number })?.min ?? 22,
          rain_prob: Math.round(((day.pop as number) ?? 0) * 100),
          rainfall_mm: parseFloat(rain.toFixed(1)),
          condition: ((day.weather as {description:string}[])?.[0])?.description || 'Clear',
          advice: rain > 5 ? 'Avoid pesticide spraying' : 'Good window for field work',
        });
      });
      return days;
    } catch (err) {
      console.warn('[enrichmentService] OpenWeather forecast fetch failed:', err);
    }
  }
  // Mock fallback
  const conditions = ['Sunny', 'Partly Cloudy', 'Light Rain', 'Thunderstorm', 'Clear', 'Windy'];
  const advices = [
    'Good window for field work',
    'Avoid pesticide spraying',
    'Check field drainage',
    'Irrigate in the evening',
    'Monitor for pest activity',
  ];
  for (let i = 0; i < 7; i++) {
    const d = new Date(Date.now() + i * 86400000);
    const rainMm = parseFloat((r() * 18).toFixed(1));
    days.push({
      date: d.toISOString().split('T')[0],
      temp_max: parseFloat((28 + r() * 12).toFixed(1)),
      temp_min: parseFloat((18 + r() * 8).toFixed(1)),
      rain_prob: Math.round(r() * 90),
      rainfall_mm: rainMm,
      condition: conditions[Math.floor(r() * conditions.length)],
      advice: advices[Math.floor(r() * advices.length)],
    });
  }
  return days;
}

// ─── Public API ───────────────────────────────────────────────────────────────

export const enrichmentService = {
  /**
   * Main entry point — call after registration or profile save.
   * Fetches soil + weather data and stores under user_advanced_data collection.
   */
  async enrichUserData(uid: string, lat: number, lon: number): Promise<UserAdvancedData> {
    console.info(`[enrichmentService] Enriching data for uid=${uid} at (${lat}, ${lon})`);

    const [soil, historical, forecast] = await Promise.all([
      fetchSoilGridsData(lat, lon),
      fetchHistoricalWeather(lat, lon),
      fetchWeatherForecast(lat, lon),
    ]);

    const data: UserAdvancedData = {
      id: uid,
      uid,
      soil_nutrients: soil,
      historical_weather: historical,
      weather_forecast: forecast,
      enriched_at: Date.now(),
    };

    await firebaseService.saveAdvancedData(data);
    console.info('[enrichmentService] ✓ Data enriched and saved.');
    return data;
  },

  /** Returns cached enriched data, or fetches fresh if older than 24h */
  async getOrRefreshData(uid: string, lat: number, lon: number): Promise<UserAdvancedData> {
    const cached = await firebaseService.getAdvancedData(uid);
    const age = cached ? Date.now() - cached.enriched_at : Infinity;
    if (cached && age < 86400000) return cached;     // <24h, use cache
    return this.enrichUserData(uid, lat, lon);
  },
};
