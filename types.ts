export enum Language {
  EN = 'en', // English
  HI = 'hi', // Hindi
  TA = 'ta', // Tamil
  TE = 'te', // Telugu
  ML = 'ml', // Malayalam
  KN = 'kn', // Kannada
  MR = 'mr', // Marathi
}

// 1. Users Collection
export interface UserProfile {
  id: string; // Added to satisfy { id: string } constraint in FirebaseService
  uid: string;
  name: string;
  phone: string;
  language: Language;
  location: {
    state: string;
    district: string;
    lat: number;
    lng: number;
    name: string; // Display name
  };
  createdAt: number;
  
  // Extended Farm Profile
  farmSizeAcres: number;
  primaryCrop: string;
  irrigationType: 'Tube Well' | 'Canal' | 'Rainfed' | 'Drip';
  soilType: 'Clay' | 'Sandy' | 'Loamy' | 'Black' | 'Red' | 'Unknown';
  farmingExperience: number; // Years
  isFpoMember: boolean;
  
  sowingDate?: string;
}

// 2. Crops Collection
export interface Crop {
  id: string; // crop_id
  uid: string;
  cropName: string;
  season: 'Kharif' | 'Rabi' | 'Zaid';
  landAreaAcres: number;
  sowingDate: string; // ISO String
  currentStage: 'Seedling' | 'Vegetative' | 'Flowering' | 'Fruiting' | 'Harvested';
  status: 'Growing' | 'Harvested';
  createdAt: number;
  
  // Historical Analysis Fields (Populated on Harvest)
  yieldAmount?: string;
  yieldQuality?: 'Low' | 'Medium' | 'High';
  profitability?: 'Loss' | 'Average' | 'High';
  issuesEncountered?: string[]; // Array of disease IDs encountered
}

// 3. Crop Inputs (Sub-collection)
export interface CropInput {
  id: string;
  cropId: string;
  type: 'Fertilizer' | 'Pesticide' | 'Irrigation' | 'Labor';
  name: string;
  quantity: number;
  unit: string;
  cost: number;
  date: number;
}

// 4. Crop Health (Disease Reports)
export interface CropHealthReport {
  id: string;
  cropId: string; // Link to specific crop cycle
  uid: string;
  diseaseName: string;
  confidence: number;
  confirmed: boolean;
  imageUri?: string;
  detectedOn: number;
}

// 5. Soil Reports
export interface SoilReport {
  id: string;
  uid: string;
  source: 'SoilGrids' | 'Uploaded' | 'GovtCard';
  ph: number;
  nitrogen: 'Low' | 'Medium' | 'High';
  phosphorus: 'Low' | 'Medium' | 'High';
  potassium: 'Low' | 'Medium' | 'High';
  organicCarbon: 'Low' | 'Medium' | 'High';
  texture: 'Sandy' | 'Loamy' | 'Clayey';
  createdAt: number;
}

// 6. Weather & Alerts (Runtime types)
export interface WeatherData {
  temp: number;
  humidity: number;
  windSpeed: number;
  precipProb: number;
  condition: string;
  alerts: WeatherAlert[];
  forecast: DailyWeather[];
  weeklySummary: Record<Language, string>;
  weeklyAdvice: Record<Language, string>;
}

export interface WeatherAlert {
  type: 'Rain' | 'Heat' | 'Disease' | 'Wind';
  severity: 'Low' | 'Medium' | 'High';
  message: Record<Language, string>;
  action: Record<Language, string>;
}

export interface DailyWeather {
  day: string;
  date: string;
  temp: number;
  condition: string;
  rainfall: number;
}

// 7. Market Prices
export interface MarketData {
  crop: string;
  price: number;
  unit: string;
  trend: 'up' | 'down' | 'stable';
  difference: number;
}

// 8. Schemes
export interface Scheme {
  id: string;
  name: Record<Language, string>;
  description: Record<Language, string>;
  benefits: Record<Language, string>;
  eligibilityRule: (user: UserProfile) => boolean;
}

export interface InputAdvisory {
  action: 'safe' | 'warning' | 'danger';
  title: Record<Language, string>;
  message: Record<Language, string>;
  icon: 'droplet' | 'wind' | 'check';
}

export interface CropRecommendation {
  cropName: Record<Language, string>;
  suitabilityScore: number;
  reasons: Record<Language, string[]>;
  image: string;
}

// App Context including Navigation State
export interface AppContextType {
  user: UserProfile | null;
  setUser: (u: UserProfile | null) => void; // Allow null for logout
  language: Language;
  setLanguage: (l: Language) => void;
  isVoiceEnabled: boolean;
  toggleVoice: () => void;
  showLangSelector: boolean;
  setShowLangSelector: (show: boolean) => void;
  isAssistantOpen: boolean;
  setAssistantOpen: (open: boolean) => void;
  currentView: string;
  setView: (view: string) => void;
  isAuthenticated: boolean;
  login: (method: 'phone' | 'google', data: any) => Promise<void>;
  logout: () => void;
}

export interface DiseaseInfo {
  id: string;
  name: Record<Language, string>;
  description: Record<Language, string>;
  treatment: {
    do: Record<Language, string[]>;
    dont: Record<Language, string[]>;
  };
}

export interface YieldPrediction {
  yieldAmount: string;
  riskLevel: 'Low' | 'Medium' | 'High';
  factors: {
    factor: string;
    impact: 'Positive' | 'Negative';
    description: string;
  }[];
}

export interface DiseaseReport {
  id: string;
  diseaseId: string | null;
  timestamp: number;
  location: {
    lat: number;
    lng: number;
  };
  confirmed: boolean;
}

export interface SoilData {
  ph: number;
  texture: 'Sandy' | 'Loamy' | 'Clay';
  organicCarbon: 'Low' | 'Medium' | 'High';
  nitrogen: 'Low' | 'Medium' | 'High';
  phosphorus: 'Low' | 'Medium' | 'High';
  potassium: 'Low' | 'Medium' | 'High';
  source: 'SoilGrids' | 'LabReport' | 'Uploaded';
  confidence: 'Estimate' | 'Verified';
}

export interface InputLogEntry {
  id: string;
  type: string;
  quantity: string;
  date: number;
  cost: number;
}

export interface FarmRecord {
  id: string;
  season: string;
  crop: string;
  sowingDate: string;
  harvestDate?: string;
  status: 'Active' | 'Harvested';
  stage?: string;
  area: number;
  inputs: InputLogEntry[];
  yield?: string;
  issue?: string | null;
  profit?: 'High' | 'Average' | 'Loss';
  cropName?: string;
  profitability?: 'High' | 'Average' | 'Loss';
}

export type CropStage = 'Seedling' | 'Vegetative' | 'Flowering' | 'Fruiting' | 'Harvest';

// ─────────────────────────────────────────────────────────────────────────────
// NEW INTERFACES — Advanced Modular Features
// ─────────────────────────────────────────────────────────────────────────────

// Extended User Profile (auth system — mirrors `users` MongoDB collection)
export interface UserProfileExtended extends UserProfile {
  email: string;
  password_hash: string; // bcrypt in production; btoa() in demo
  present_crop: string;
  present_crop_stage: 'Seedling' | 'Vegetative' | 'Flowering' | 'Fruiting' | 'Pre-Harvest' | 'Harvested';
  past_crop: string;
  past_plant_disease: string[];
}

// ─── user_advanced_data collection ──────────────────────────────────────────
export interface SoilNutrients {
  nitrogen_kg_ha: number;       // kg/ha
  phosphorus_kg_ha: number;
  potassium_kg_ha: number;
  ph: number;
  moisture_percent: number;
  organic_carbon_percent: number;
  texture: 'Sandy' | 'Loamy' | 'Clay' | 'Silt';
  source: 'SoilGrids' | 'LabReport' | 'Mock';
  fetched_at: number;
}

export interface HistoricalWeatherDay {
  date: string;           // ISO date
  temp_max: number;
  temp_min: number;
  humidity: number;
  rainfall_mm: number;
  condition: string;
}

export interface WeatherForecastDay {
  date: string;
  temp_max: number;
  temp_min: number;
  rain_prob: number;
  rainfall_mm: number;
  condition: string;
  advice: string;
}

export interface UserAdvancedData {
  id: string;             // same as uid
  uid: string;
  soil_nutrients: SoilNutrients;
  historical_weather: HistoricalWeatherDay[];   // last 7 days
  weather_forecast: WeatherForecastDay[];        // next 7 days
  enriched_at: number;
}

// ─── pest_reports collection ─────────────────────────────────────────────────
export interface PestReport {
  id: string;
  uid: string;
  pest_name: string;
  severity: 'Low' | 'Medium' | 'High' | 'Critical';
  lat: number;
  lon: number;
  location_name: string;
  crop_affected: string;
  preventive_measures: string[];
  suggested_pesticides: string[];
  reported_at: number;
  // product recommendations (e-commerce mock)
  product_recommendations?: ProductRecommendation[];
}

export interface ProductRecommendation {
  id: string;
  name: string;
  brand: string;
  dosage: string;
  price_range: string;        // e.g. "₹250 – ₹480"
  available_online: boolean;
  buy_url: string;            // mock URL
}

// ─── advisory_logs collection ─────────────────────────────────────────────────
export interface IrrigationSlot {
  day: string;                // e.g. "Monday"
  date: string;               // ISO date
  time: string;               // e.g. "06:30"
  duration_minutes: number;
  method: string;             // e.g. "Drip", "Sprinkler"
  reminder_sent: boolean;
}

export interface PestRiskAlert {
  pest: string;
  risk_level: 'Low' | 'Medium' | 'High';
  affected_crop: string;
  action: string;
}

export interface HarvestPlan {
  estimated_harvest_date: string;
  expected_yield_qtl: number;
  quality_forecast: 'Low' | 'Medium' | 'High';
  market_timing_advice: string;
  post_harvest_tips: string[];
}

export interface AdvisoryLog {
  id: string;
  uid: string;
  week_start: string;         // ISO date (Monday of week)
  irrigation_schedule: IrrigationSlot[];
  pest_risk_alerts: PestRiskAlert[];
  harvest_plan: HarvestPlan;
  raw_ai_response: string;
  created_at: number;
}

// ─── market_trends collection ─────────────────────────────────────────────────
export interface MarketTrend {
  id: string;
  crop: string;
  date: string;               // ISO date
  min_price: number;          // ₹/quintal
  max_price: number;
  modal_price: number;
  market_name: string;        // APMC / Mandi name
  state: string;
  trend: 'up' | 'down' | 'stable';
  demand_level: 'Low' | 'Medium' | 'High' | 'Very High';
}

// ─── Crop Recommendation Engine ───────────────────────────────────────────────
export interface CropRecommendationResult {
  id: string;
  crop_name: string;
  exotic: boolean;            // true = exotic/high-value
  suitability_score: number;  // 0–100
  expected_yield_qtl_acre: number;
  market_demand: 'Low' | 'Medium' | 'High' | 'Very High';
  risk_level: 'Low' | 'Medium' | 'High';
  estimated_revenue_per_acre: number;   // ₹
  reasons: string[];          // Why recommended
  soil_match: string;
  weather_match: string;
  market_match: string;
  grow_duration_days: number;
  vendor_matches: VendorBuyer[];
}

// ─── Vendor / Buyer (market_linkage collection) ───────────────────────────────
export interface VendorBuyer {
  id: string;
  name: string;
  type: 'Buyer' | 'Wholesaler' | 'Exporter' | 'Retailer' | 'FPO';
  crops_interested: string[];
  state: string;
  district: string;
  lat: number;
  lon: number;
  contact: string;            // mock phone
  rating: number;             // 1–5
  min_quantity_qtl: number;
  price_premium_percent: number; // Above mandi price
  connected?: boolean;        // connection request state
}

// ─── Scheduler Job ────────────────────────────────────────────────────────────
export interface ScheduledJob {
  id: string;
  type: 'irrigation_reminder' | 'weekly_advisory' | 'pest_check';
  uid: string;
  next_run: number;           // timestamp
  interval_ms: number;
  last_run: number | null;
  payload: Record<string, unknown>;
}