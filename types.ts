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