/**
 * marketLinkageService.ts
 * ─────────────────────────────────────────────────────────────────────────────
 * Vendor / buyer marketplace simulation.
 * - 25-entry mock vendor database across Indian states and crop types
 * - Proximity filtering (haversine)
 * - Connection request management (stored in localStorage)
 * - Market price enrichment for advisory engine
 */

import { VendorBuyer, MarketTrend } from '../types';
import { firebaseService } from './firebaseService';

// ─── Vendor database ──────────────────────────────────────────────────────────

const VENDOR_DB: VendorBuyer[] = [
  { id: 'v1', name: 'Reliance Fresh Procurement', type: 'Buyer', crops_interested: ['Tomato', 'Broccoli', 'Capsicum', 'Strawberry'], state: 'Maharashtra', district: 'Pune', lat: 18.52, lon: 73.85, contact: '+91-98200-11111', rating: 4.7, min_quantity_qtl: 50, price_premium_percent: 8 },
  { id: 'v2', name: 'Dragon Fruit Exports Pvt Ltd', type: 'Exporter', crops_interested: ['Dragon Fruit', 'Papaya', 'Passion Fruit'], state: 'Tamil Nadu', district: 'Coimbatore', lat: 11.00, lon: 76.97, contact: '+91-98411-22222', rating: 4.5, min_quantity_qtl: 20, price_premium_percent: 15 },
  { id: 'v3', name: 'Moringa Valley FPO', type: 'FPO', crops_interested: ['Moringa', 'Drumstick', 'Turmeric', 'Ginger'], state: 'Andhra Pradesh', district: 'Kadapa', lat: 14.47, lon: 78.82, contact: '+91-94401-33333', rating: 4.3, min_quantity_qtl: 10, price_premium_percent: 6 },
  { id: 'v4', name: 'Himalayan Herb Traders', type: 'Wholesaler', crops_interested: ['Lavender', 'Rosemary', 'Chamomile', 'Saffron'], state: 'Himachal Pradesh', district: 'Kullu', lat: 31.96, lon: 77.11, contact: '+91-98052-44444', rating: 4.2, min_quantity_qtl: 5, price_premium_percent: 20 },
  { id: 'v5', name: 'Quinoa Health Foods', type: 'Buyer', crops_interested: ['Quinoa', 'Chia', 'Buckwheat', 'Amaranth'], state: 'Rajasthan', district: 'Jaipur', lat: 26.91, lon: 75.78, contact: '+91-94140-55555', rating: 4.0, min_quantity_qtl: 15, price_premium_percent: 12 },
  { id: 'v6', name: 'BigBasket Agri Direct', type: 'Buyer', crops_interested: ['Broccoli', 'Lettuce', 'Kale', 'Strawberry', 'Cherry Tomato'], state: 'Karnataka', district: 'Bengaluru', lat: 12.97, lon: 77.59, contact: '+91-80391-66666', rating: 4.8, min_quantity_qtl: 30, price_premium_percent: 10 },
  { id: 'v7', name: 'Punjab Grain Aggregators', type: 'Wholesaler', crops_interested: ['Wheat', 'Rice', 'Maize', 'Barley'], state: 'Punjab', district: 'Ludhiana', lat: 30.90, lon: 75.84, contact: '+91-98147-77777', rating: 4.1, min_quantity_qtl: 100, price_premium_percent: 3 },
  { id: 'v8', name: 'South India Spice Board', type: 'Exporter', crops_interested: ['Turmeric', 'Chilli', 'Cardamom', 'Black Pepper', 'Ginger'], state: 'Kerala', district: 'Kozhikode', lat: 11.25, lon: 75.77, contact: '+91-95621-88888', rating: 4.6, min_quantity_qtl: 25, price_premium_percent: 14 },
  { id: 'v9', name: 'Nashik Grape & Wine Cooperative', type: 'FPO', crops_interested: ['Grapes', 'Pomegranate', 'Dragon Fruit'], state: 'Maharashtra', district: 'Nashik', lat: 20.01, lon: 73.79, contact: '+91-98229-99999', rating: 4.4, min_quantity_qtl: 40, price_premium_percent: 9 },
  { id: 'v10', name: 'Supermarket Agri Connect', type: 'Retailer', crops_interested: ['Broccoli', 'Mushroom', 'Quinoa', 'Strawberry', 'Moringa'], state: 'Delhi', district: 'South Delhi', lat: 28.58, lon: 77.22, contact: '+91-11234-10000', rating: 4.5, min_quantity_qtl: 10, price_premium_percent: 11 },
  { id: 'v11', name: 'AP Horticulture Corporation', type: 'Buyer', crops_interested: ['Banana', 'Papaya', 'Mango', 'Dragon Fruit', 'Moringa'], state: 'Andhra Pradesh', district: 'Vijayawada', lat: 16.50, lon: 80.64, contact: '+91-86394-11111', rating: 4.2, min_quantity_qtl: 50, price_premium_percent: 5 },
  { id: 'v12', name: 'Gujarat Organic Agri', type: 'Exporter', crops_interested: ['Cumin', 'Fennel', 'Castor', 'Cotton', 'Groundnut'], state: 'Gujarat', district: 'Rajkot', lat: 22.30, lon: 70.78, contact: '+91-99099-12222', rating: 4.0, min_quantity_qtl: 60, price_premium_percent: 7 },
  { id: 'v13', name: 'Ooty Vegetable Market FPO', type: 'FPO', crops_interested: ['Carrot', 'Cabbage', 'Capsicum', 'Beans', 'Broccoli', 'Strawberry'], state: 'Tamil Nadu', district: 'Nilgiris', lat: 11.41, lon: 76.70, contact: '+91-94876-13333', rating: 4.3, min_quantity_qtl: 20, price_premium_percent: 6 },
  { id: 'v14', name: 'Herbal India Exports', type: 'Exporter', crops_interested: ['Ashwagandha', 'Tulsi', 'Lavender', 'Aloe Vera', 'Stevia'], state: 'Madhya Pradesh', district: 'Indore', lat: 22.71, lon: 75.86, contact: '+91-73899-14444', rating: 4.1, min_quantity_qtl: 8, price_premium_percent: 18 },
  { id: 'v15', name: 'Agro Mushroom Pvt Ltd', type: 'Buyer', crops_interested: ['Mushroom', 'Oyster Mushroom', 'Button Mushroom'], state: 'Haryana', district: 'Karnal', lat: 29.68, lon: 76.99, contact: '+91-98126-15555', rating: 4.6, min_quantity_qtl: 5, price_premium_percent: 22 },
  { id: 'v16', name: 'Konkan Mango & Cashew Board', type: 'Wholesaler', crops_interested: ['Mango', 'Cashew', 'Coconut', 'Dragon Fruit'], state: 'Maharashtra', district: 'Ratnagiri', lat: 16.99, lon: 73.30, contact: '+91-90284-16666', rating: 4.4, min_quantity_qtl: 30, price_premium_percent: 8 },
  { id: 'v17', name: 'SAFAL Direct Farm', type: 'Buyer', crops_interested: ['Tomato', 'Onion', 'Potato', 'Broccoli', 'Capsicum'], state: 'Delhi', district: 'North Delhi', lat: 28.70, lon: 77.10, contact: '+91-11567-17777', rating: 4.7, min_quantity_qtl: 25, price_premium_percent: 9 },
  { id: 'v18', name: 'Kolhapur Jaggery Collective', type: 'FPO', crops_interested: ['Sugarcane', 'Turmeric', 'Rice'], state: 'Maharashtra', district: 'Kolhapur', lat: 16.70, lon: 74.24, contact: '+91-98902-18888', rating: 4.2, min_quantity_qtl: 40, price_premium_percent: 5 },
  { id: 'v19', name: 'Northeast Spice Traders', type: 'Wholesaler', crops_interested: ['Ginger', 'Cardamom', 'Turmeric', 'Pineapple', 'Dragon Fruit'], state: 'Assam', district: 'Guwahati', lat: 26.14, lon: 91.74, contact: '+91-94351-19999', rating: 4.0, min_quantity_qtl: 15, price_premium_percent: 10 },
  { id: 'v20', name: 'Zero Miles Agri Platform', type: 'Retailer', crops_interested: ['Any vegetable', 'Organic produce', 'Quinoa', 'Moringa', 'Strawberry'], state: 'Maharashtra', district: 'Mumbai', lat: 19.08, lon: 72.88, contact: '+91-98200-20000', rating: 4.5, min_quantity_qtl: 5, price_premium_percent: 15 },
  { id: 'v21', name: 'Himachal Apple & Berry Board', type: 'Wholesaler', crops_interested: ['Apple', 'Strawberry', 'Blueberry', 'Lavender', 'Walnut'], state: 'Himachal Pradesh', district: 'Shimla', lat: 31.10, lon: 77.17, contact: '+91-98050-21111', rating: 4.4, min_quantity_qtl: 20, price_premium_percent: 12 },
  { id: 'v22', name: 'Deccan Pulses & Millets FPO', type: 'FPO', crops_interested: ['Sorghum', 'Pearl Millet', 'Quinoa', 'Lentil', 'Chickpea'], state: 'Telangana', district: 'Warangal', lat: 17.97, lon: 79.59, contact: '+91-94401-22222', rating: 4.1, min_quantity_qtl: 30, price_premium_percent: 6 },
  { id: 'v23', name: 'WayCool Foods', type: 'Buyer', crops_interested: ['Tomato', 'Banana', 'Moringa', 'Coconut', 'Mango', 'Broccoli'], state: 'Tamil Nadu', district: 'Chennai', lat: 13.08, lon: 80.27, contact: '+91-44900-23333', rating: 4.6, min_quantity_qtl: 50, price_premium_percent: 7 },
  { id: 'v24', name: 'Rajasthan Desert Herbs', type: 'Exporter', crops_interested: ['Isabgol', 'Senna', 'Ashwagandha', 'Fenugreek', 'Lavender'], state: 'Rajasthan', district: 'Jodhpur', lat: 26.29, lon: 73.02, contact: '+91-94140-24444', rating: 4.0, min_quantity_qtl: 10, price_premium_percent: 16 },
  { id: 'v25', name: 'Amazon Pantry Farm Connect', type: 'Buyer', crops_interested: ['Strawberry', 'Mushroom', 'Dragon Fruit', 'Broccoli', 'Quinoa', 'Moringa'], state: 'Karnataka', district: 'Bengaluru', lat: 12.95, lon: 77.70, contact: '+91-80123-25555', rating: 4.8, min_quantity_qtl: 10, price_premium_percent: 10 },
];

// ─── Mock market trends ───────────────────────────────────────────────────────

const MARKET_TRENDS_DB: Omit<MarketTrend, 'id' | 'date'>[] = [
  { crop: 'Dragon Fruit', min_price: 5500, max_price: 8500, modal_price: 7000, market_name: 'Vashi APMC', state: 'Maharashtra', trend: 'up', demand_level: 'Very High' as const },
  { crop: 'Broccoli', min_price: 2200, max_price: 3800, modal_price: 3000, market_name: 'Bowenpally', state: 'Telangana', trend: 'up', demand_level: 'High' as const },
  { crop: 'Strawberry', min_price: 7000, max_price: 12000, modal_price: 9000, market_name: 'Ooty Market', state: 'Tamil Nadu', trend: 'stable', demand_level: 'Very High' as const },
  { crop: 'Moringa', min_price: 2500, max_price: 4500, modal_price: 3500, market_name: 'Dindigul', state: 'Tamil Nadu', trend: 'up', demand_level: 'High' as const },
  { crop: 'Tomato', min_price: 1200, max_price: 2200, modal_price: 1700, market_name: 'Azadpur', state: 'Delhi', trend: 'down', demand_level: 'Medium' as const },
  { crop: 'Rice', min_price: 1950, max_price: 2400, modal_price: 2200, market_name: 'Nanded', state: 'Maharashtra', trend: 'stable', demand_level: 'Medium' as const },
  { crop: 'Wheat', min_price: 2200, max_price: 2600, modal_price: 2400, market_name: 'Khanna', state: 'Punjab', trend: 'up', demand_level: 'High' as const },
  { crop: 'Quinoa', min_price: 18000, max_price: 28000, modal_price: 22000, market_name: 'Jaipur', state: 'Rajasthan', trend: 'up', demand_level: 'High' as const },
  { crop: 'Turmeric', min_price: 6500, max_price: 10000, modal_price: 8000, market_name: 'Erode', state: 'Tamil Nadu', trend: 'stable', demand_level: 'High' as const },
  { crop: 'Mushroom', min_price: 8000, max_price: 14000, modal_price: 11000, market_name: 'Hisar', state: 'Haryana', trend: 'up', demand_level: 'Very High' as const },
];

function haversineKm(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((lat1 * Math.PI) / 180) * Math.cos((lat2 * Math.PI) / 180) * Math.sin(dLon / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

// ─── Seed market trends into collection (called once on app start) ─────────────

let seeded = false;
async function seedMarketTrends() {
  if (seeded) return;
  seeded = true;
  const existing = await firebaseService.getMarketTrends();
  if (existing.length > 0) return; // Already seeded
  const today = new Date().toISOString().split('T')[0];
  for (const t of MARKET_TRENDS_DB) {
    await firebaseService.saveMarketTrend({ ...t, id: `mt_${t.crop}_${today}`, date: today });
  }
}

// Seed vendors into collection
async function seedVendors() {
  const existing = await firebaseService.getVendors();
  if (existing.length > 0) return;
  for (const v of VENDOR_DB) {
    await firebaseService.createDocument('vendor_buyers', v);
  }
}

// ─── Public API ───────────────────────────────────────────────────────────────

export const marketLinkageService = {
  /** Initialize mock data (call on app startup) */
  async seed() {
    await Promise.all([seedMarketTrends(), seedVendors()]);
  },

  /** Get vendors matching a crop name, sorted by rating */
  async getVendorsForCrop(cropName: string, userLat?: number, userLon?: number): Promise<VendorBuyer[]> {
    await seedVendors();
    const vendors = await firebaseService.getVendors(cropName);
    // Add distance if user location provided
    if (userLat !== undefined && userLon !== undefined) {
      return vendors
        .map((v) => ({ ...v, _distance: haversineKm(userLat, userLon, v.lat, v.lon) }))
        .sort((a, b) => (a as VendorBuyer & { _distance: number })._distance - (b as VendorBuyer & { _distance: number })._distance)
        .slice(0, 5);
    }
    return vendors.sort((a, b) => b.rating - a.rating).slice(0, 5);
  },

  /** Get all vendors with optional crop filter */
  async getAllVendors(cropFilter?: string): Promise<VendorBuyer[]> {
    await seedVendors();
    const vendors = await firebaseService.getVendors(cropFilter);
    return vendors.sort((a, b) => b.rating - a.rating);
  },

  /** Get market trends with optional crop filter */
  async getMarketTrends(crop?: string): Promise<MarketTrend[]> {
    await seedMarketTrends();
    return firebaseService.getMarketTrends(crop);
  },

  /** Simulate connecting with a vendor */
  async connectToVendor(uid: string, vendorId: string): Promise<void> {
    await firebaseService.saveVendorConnection(uid, vendorId);
    console.info(`[marketLinkage] User ${uid} connected to vendor ${vendorId}`);
  },

  /** Get list of vendor IDs user has connected with */
  getConnectedVendorIds(uid: string): string[] {
    return firebaseService.getVendorConnections(uid);
  },

  get VENDOR_DB() { return VENDOR_DB; },
};
