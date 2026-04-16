import { UserProfile, Crop, CropInput, CropHealthReport, SoilReport, UserAdvancedData, PestReport, AdvisoryLog, MarketTrend, VendorBuyer, UserProfileExtended } from '../types';

/**
 * Mock Firebase Service
 * This replicates the architecture of Firebase (Auth + Firestore)
 * using localStorage to persist data in the browser for the demo.
 * 
 * In production, this file is replaced by real firebase/app, firebase/auth, firebase/firestore calls.
 */

const COLLECTIONS = {
  USERS: 'users',
  CROPS: 'crops',
  CROP_INPUTS: 'crop_inputs',
  CROP_HEALTH: 'crop_health',
  SOIL_REPORTS: 'soil_reports',
  // ── New collections (mirrors MongoDB schema) ──
  USER_ADVANCED_DATA: 'user_advanced_data',
  PEST_REPORTS: 'pest_reports',
  ADVISORY_LOGS: 'advisory_logs',
  MARKET_TRENDS: 'market_trends',
  VENDOR_BUYERS: 'vendor_buyers',
};

class FirebaseService {
  private currentUser: UserProfile | null = null;

  constructor() {
    const savedUser = localStorage.getItem('smartagri_auth_user');
    if (savedUser) {
      this.currentUser = JSON.parse(savedUser);
    }
  }

  // --- AUTHENTICATION ---

  async signInWithPhone(phoneNumber: string, otp: string): Promise<UserProfile> {
    // Simulate API call
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    // In real app: Firebase Phone Auth verifyPhoneNumber()
    if (otp !== '1234') throw new Error("Invalid OTP");

    // Check if user exists in DB
    let user = await this.getDocument<UserProfile>(COLLECTIONS.USERS, phoneNumber); // Using phone as ID for mock
    
    if (!user) {
      // Create partial user (profile pending)
      user = {
        id: phoneNumber,
        uid: phoneNumber,
        phone: phoneNumber,
        name: '',
        language: 'en' as any,
        location: { state: '', district: '', lat: 0, lng: 0, name: '' },
        createdAt: Date.now(),
        // Extended Farm Profile Defaults
        farmSizeAcres: 0,
        primaryCrop: '',
        irrigationType: 'Rainfed',
        soilType: 'Unknown',
        farmingExperience: 0,
        isFpoMember: false
      };
    }

    this.setCurrentUser(user);
    return user;
  }

  async signInWithGoogle(): Promise<UserProfile> {
    // Simulate API call
    await new Promise(resolve => setTimeout(resolve, 1500));
    
    // Mock Google User
    const mockGoogleId = "google_user_" + Date.now();
    const user: UserProfile = {
      id: mockGoogleId,
      uid: mockGoogleId,
      phone: '',
      name: 'Google User',
      language: 'en' as any,
      location: { state: '', district: '', lat: 0, lng: 0, name: '' },
      createdAt: Date.now(),
      // Extended Farm Profile Defaults
      farmSizeAcres: 0,
      primaryCrop: '',
      irrigationType: 'Rainfed',
      soilType: 'Unknown',
      farmingExperience: 0,
      isFpoMember: false
    };
    
    // In real app: we'd check if this Google UID exists
    this.setCurrentUser(user);
    return user;
  }

  logout() {
    this.currentUser = null;
    localStorage.removeItem('smartagri_auth_user');
  }

  getCurrentUser() {
    return this.currentUser;
  }

  private setCurrentUser(user: UserProfile) {
    this.currentUser = user;
    localStorage.setItem('smartagri_auth_user', JSON.stringify(user));
  }

  // --- FIRESTORE (MOCKED) ---

  // Helper to simulate collection storage
  private getCollectionData<T>(collection: string): T[] {
    return JSON.parse(localStorage.getItem(`firestore_${collection}`) || '[]');
  }

  private saveCollectionData<T>(collection: string, data: T[]) {
    localStorage.setItem(`firestore_${collection}`, JSON.stringify(data));
  }

  async createDocument<T extends { id: string }>(collection: string, data: T): Promise<void> {
    const items = this.getCollectionData<T>(collection);
    // update if exists, else push
    const index = items.findIndex(i => i.id === data.id);
    if (index >= 0) {
      items[index] = { ...items[index], ...data };
    } else {
      items.push(data);
    }
    this.saveCollectionData(collection, items);
  }

  async getDocument<T extends { id: string }>(collection: string, id: string): Promise<T | null> {
    const items = this.getCollectionData<T>(collection);
    return items.find(i => i.id === id) || null;
  }

  async getDocuments<T>(collection: string, query?: (item: T) => boolean): Promise<T[]> {
    const items = this.getCollectionData<T>(collection);
    if (query) return items.filter(query);
    return items;
  }

  async updateDocument<T extends { id: string }>(collection: string, id: string, updates: Partial<T>): Promise<void> {
    const items = this.getCollectionData<T>(collection);
    const index = items.findIndex(i => i.id === id);
    if (index >= 0) {
      items[index] = { ...items[index], ...updates };
      this.saveCollectionData(collection, items);
      
      // If updating current user, sync local state
      if (collection === COLLECTIONS.USERS && this.currentUser?.uid === id) {
        this.setCurrentUser(items[index] as unknown as UserProfile);
      }
    }
  }

  // --- SPECIFIC DOMAIN METHODS ---

  async saveUserProfile(profile: UserProfile): Promise<void> {
    // Store keyed by UID
    await this.createDocument(COLLECTIONS.USERS, { ...profile, id: profile.uid });
    this.setCurrentUser(profile);
  }

  async getActiveCrop(uid: string): Promise<Crop | null> {
    const crops = await this.getDocuments<Crop>(COLLECTIONS.CROPS, c => c.uid === uid && c.status === 'Growing');
    // Return most recent if multiple (shouldn't happen in valid logic)
    return crops.length > 0 ? crops[crops.length - 1] : null;
  }

  async getCropHistory(uid: string): Promise<Crop[]> {
    return this.getDocuments<Crop>(COLLECTIONS.CROPS, c => c.uid === uid && c.status === 'Harvested');
  }

  async addCropInput(input: CropInput): Promise<void> {
    await this.createDocument(COLLECTIONS.CROP_INPUTS, input);
  }

  async getCropInputs(cropId: string): Promise<CropInput[]> {
    return this.getDocuments<CropInput>(COLLECTIONS.CROP_INPUTS, i => i.cropId === cropId);
  }

  // ── USER_ADVANCED_DATA ────────────────────────────────────────────────────

  async saveAdvancedData(data: UserAdvancedData): Promise<void> {
    await this.createDocument(COLLECTIONS.USER_ADVANCED_DATA, { ...data, id: data.uid });
  }

  async getAdvancedData(uid: string): Promise<UserAdvancedData | null> {
    return this.getDocument<UserAdvancedData>(COLLECTIONS.USER_ADVANCED_DATA, uid);
  }

  // ── PEST_REPORTS ──────────────────────────────────────────────────────────

  async savePestReport(report: PestReport): Promise<void> {
    await this.createDocument(COLLECTIONS.PEST_REPORTS, report);
  }

  async getAllPestReports(): Promise<PestReport[]> {
    return this.getDocuments<PestReport>(COLLECTIONS.PEST_REPORTS);
  }

  async getUserPestReports(uid: string): Promise<PestReport[]> {
    return this.getDocuments<PestReport>(COLLECTIONS.PEST_REPORTS, r => r.uid === uid);
  }

  /** Geospatial query — haversine distance filter (mirrors MongoDB $geoNear) */
  async getNearbyPestReports(lat: number, lon: number, radiusKm: number): Promise<PestReport[]> {
    const all = await this.getAllPestReports();
    return all.filter(r => {
      const d = haversineKm(lat, lon, r.lat, r.lon);
      return d <= radiusKm;
    }).sort((a, b) => b.reported_at - a.reported_at);
  }

  // ── ADVISORY_LOGS ─────────────────────────────────────────────────────────

  async saveAdvisoryLog(log: AdvisoryLog): Promise<void> {
    await this.createDocument(COLLECTIONS.ADVISORY_LOGS, log);
  }

  async getAdvisoryLogs(uid: string): Promise<AdvisoryLog[]> {
    const all = await this.getDocuments<AdvisoryLog>(COLLECTIONS.ADVISORY_LOGS, l => l.uid === uid);
    return all.sort((a, b) => b.created_at - a.created_at);
  }

  async getLatestAdvisoryLog(uid: string): Promise<AdvisoryLog | null> {
    const logs = await this.getAdvisoryLogs(uid);
    return logs[0] || null;
  }

  // ── MARKET_TRENDS ─────────────────────────────────────────────────────────

  async saveMarketTrend(trend: MarketTrend): Promise<void> {
    await this.createDocument(COLLECTIONS.MARKET_TRENDS, trend);
  }

  async getMarketTrends(crop?: string): Promise<MarketTrend[]> {
    return this.getDocuments<MarketTrend>(
      COLLECTIONS.MARKET_TRENDS,
      crop ? t => t.crop.toLowerCase() === crop.toLowerCase() : undefined
    );
  }

  // ── VENDOR_BUYERS ─────────────────────────────────────────────────────────

  async getVendors(cropFilter?: string): Promise<VendorBuyer[]> {
    const all = await this.getDocuments<VendorBuyer>(COLLECTIONS.VENDOR_BUYERS);
    if (!cropFilter) return all;
    return all.filter(v =>
      v.crops_interested.some(c => c.toLowerCase().includes(cropFilter.toLowerCase()))
    );
  }

  async saveVendorConnection(uid: string, vendorId: string): Promise<void> {
    const key = `vendor_connections_${uid}`;
    const existing: string[] = JSON.parse(localStorage.getItem(key) || '[]');
    if (!existing.includes(vendorId)) {
      existing.push(vendorId);
      localStorage.setItem(key, JSON.stringify(existing));
    }
  }

  getVendorConnections(uid: string): string[] {
    return JSON.parse(localStorage.getItem(`vendor_connections_${uid}`) || '[]');
  }

  // ── EXTENDED USER PROFILE ─────────────────────────────────────────────────

  async saveUserProfileExtended(profile: UserProfileExtended): Promise<void> {
    await this.createDocument(COLLECTIONS.USERS, { ...profile, id: profile.uid });
    this.setCurrentUser(profile as unknown as UserProfile);
  }
}

// ─── Haversine distance helper (geospatial) ───────────────────────────────────
function haversineKm(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371;
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLon / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}
function toRad(deg: number) { return (deg * Math.PI) / 180; }

export const firebaseService = new FirebaseService();