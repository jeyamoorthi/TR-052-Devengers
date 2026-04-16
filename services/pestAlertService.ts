/**
 * pestAlertService.ts
 * ─────────────────────────────────────────────────────────────────────────────
 * Cluster-based pest alert system.
 * - Report pest events → stored in pest_reports collection
 * - Find nearby users within 15km radius (haversine via firebaseService)
 * - Send browser/email alerts to neighbours
 * - Product recommendation engine (mock e-commerce catalog)
 */

import { PestReport, ProductRecommendation } from '../types';
import { firebaseService } from './firebaseService';

const ALERT_RADIUS_KM =
  parseFloat(import.meta.env.VITE_PEST_ALERT_RADIUS_KM as string) || 15;

// ─── Pest knowledge base ─────────────────────────────────────────────────────

interface PestInfo {
  preventive_measures: string[];
  suggested_pesticides: string[];
  products: Omit<ProductRecommendation, 'id'>[];
}

const PEST_DB: Record<string, PestInfo> = {
  Aphid: {
    preventive_measures: [
      'Introduce natural predators like ladybugs',
      'Apply reflective mulch to deter aphids',
      'Remove heavily infested plant parts',
      'Spray water forcefully to dislodge colonies',
    ],
    suggested_pesticides: ['Imidacloprid 17.8 SL', 'Thiamethoxam 25 WG', 'Dimethoate 30 EC', 'Neem Oil 3000 PPM'],
    products: [
      { name: 'Confidor 200 SL', brand: 'Bayer', dosage: '0.5 ml/L water', price_range: '₹320 – ₹480', available_online: true, buy_url: 'https://krishisevakendra.in/aphid-control' },
      { name: 'Actara 25 WG', brand: 'Syngenta', dosage: '0.3 g/L water', price_range: '₹650 – ₹850', available_online: true, buy_url: 'https://krishisevakendra.in/aphid-control' },
      { name: 'Neem Gold', brand: 'T-Stanes', dosage: '2.5 ml/L water', price_range: '₹180 – ₹260', available_online: true, buy_url: 'https://krishisevakendra.in/neem' },
    ],
  },
  'Leaf Blight': {
    preventive_measures: [
      'Use certified disease-free seeds',
      'Maintain proper plant spacing for air circulation',
      'Avoid overhead irrigation',
      'Remove and destroy infected plant debris',
    ],
    suggested_pesticides: ['Mancozeb 75 WP', 'Propiconazole 25 EC', 'Kasugamycin 3 SL', 'Copper Oxychloride 50 WP'],
    products: [
      { name: 'Dithane M-45', brand: 'Dow AgroSciences', dosage: '2.5 g/L water', price_range: '₹120 – ₹200', available_online: true, buy_url: 'https://krishisevakendra.in/fungicide' },
      { name: 'Tilt 250 EC', brand: 'Syngenta', dosage: '0.5 ml/L water', price_range: '₹380 – ₹520', available_online: true, buy_url: 'https://krishisevakendra.in/fungicide' },
      { name: 'Plantomycin', brand: 'Indofil', dosage: '0.2 g/L water', price_range: '₹90 – ₹140', available_online: false, buy_url: '' },
    ],
  },
  'Stem Borer': {
    preventive_measures: [
      'Use resistant crop varieties',
      'Install pheromone traps (5/acre)',
      'Remove and destroy stem borer egg masses',
      'Drain and dry fields for 2–3 days',
    ],
    suggested_pesticides: ['Chlorpyrifos 20 EC', 'Carbofuran 3 G', 'Fipronil 0.3 G', 'Rynaxypyr 18.5 SC'],
    products: [
      { name: 'Coragen 18.5 SC', brand: 'FMC', dosage: '0.4 ml/L water', price_range: '₹2200 – ₹3000', available_online: true, buy_url: 'https://krishisevakendra.in/stem-borer' },
      { name: 'Chlorpyrifos 20 EC', brand: 'Generic', dosage: '2 ml/L water', price_range: '₹200 – ₹350', available_online: true, buy_url: 'https://krishisevakendra.in/stem-borer' },
      { name: 'Furadon 3G', brand: 'FMC', dosage: '10 kg/acre soil', price_range: '₹450 – ₹600', available_online: false, buy_url: '' },
    ],
  },
  Whitefly: {
    preventive_measures: [
      'Use yellow sticky traps (10–15/acre)',
      'Spray insecticidal soap solution',
      'Maintain field hygiene; remove weeds',
      'Avoid excessive nitrogen fertilisation',
    ],
    suggested_pesticides: ['Spiromesifen 22.9 SC', 'Diafenthiuron 50 WP', 'Buprofezin 25 SC', 'Acetamiprid 20 SP'],
    products: [
      { name: 'Oberon 22.9 SC', brand: 'Bayer', dosage: '1 ml/L water', price_range: '₹1100 – ₹1400', available_online: true, buy_url: 'https://krishisevakendra.in/whitefly' },
      { name: 'Polo 500 WP', brand: 'Syngenta', dosage: '0.4 g/L water', price_range: '₹520 – ₹700', available_online: true, buy_url: 'https://krishisevakendra.in/whitefly' },
      { name: 'Yellow Sticky Trap', brand: 'Multiplex', dosage: '10-15 per acre', price_range: '₹50 – ₹90', available_online: true, buy_url: 'https://krishisevakendra.in/traps' },
    ],
  },
  Thrips: {
    preventive_measures: [
      'Avoid water stress which increases susceptibility',
      'Use blue sticky traps for monitoring',
      'Intercrop with repellent crops like coriander',
      'Avoid broad-spectrum pesticides that kill natural enemies',
    ],
    suggested_pesticides: ['Spinosad 45 SC', 'Abamectin 1.9 EC', 'Fipronil 5 SC', 'Lambda-cyhalothrin 5 EC'],
    products: [
      { name: 'Tracer 45 SC', brand: 'Dow AgroSciences', dosage: '0.3 ml/L water', price_range: '₹1800 – ₹2400', available_online: true, buy_url: 'https://krishisevakendra.in/thrips' },
      { name: 'Vertimec 1.9 EC', brand: 'Syngenta', dosage: '0.5 ml/L water', price_range: '₹750 – ₹950', available_online: true, buy_url: 'https://krishisevakendra.in/thrips' },
      { name: 'Karate 5 EC', brand: 'Syngenta', dosage: '1 ml/L water', price_range: '₹250 – ₹380', available_online: false, buy_url: '' },
    ],
  },
  'Powdery Mildew': {
    preventive_measures: [
      'Plant resistant varieties whenever possible',
      'Ensure good air circulation',
      'Apply potassium bicarbonate spray preventively',
      'Avoid wetting leaves during irrigation',
    ],
    suggested_pesticides: ['Sulphur 80 WP', 'Hexaconazole 5 EC', 'Triadimefon 25 WP', 'Myclobutanil 10 WP'],
    products: [
      { name: 'Thiovit Jet', brand: 'Syngenta', dosage: '2.5 g/L water', price_range: '₹110 – ₹180', available_online: true, buy_url: 'https://krishisevakendra.in/mildew' },
      { name: 'Contaf Plus', brand: 'Bayer', dosage: '1 ml/L water', price_range: '₹380 – ₹520', available_online: true, buy_url: 'https://krishisevakendra.in/mildew' },
      { name: 'Systhane 12 EW', brand: 'Dow', dosage: '1 ml/L water', price_range: '₹490 – ₹640', available_online: false, buy_url: '' },
    ],
  },
};

const DEFAULT_PEST_INFO: PestInfo = {
  preventive_measures: [
    'Monitor fields regularly for early detection',
    'Maintain field hygiene and remove crop debris',
    'Use balanced fertilisation to avoid over-lush growth',
    'Consult local agricultural extension officer',
  ],
  suggested_pesticides: ['Neem Oil 3000 PPM', 'Chlorpyrifos 20 EC', 'Mancozeb 75 WP'],
  products: [
    { name: 'Neem Gold', brand: 'T-Stanes', dosage: '2.5 ml/L water', price_range: '₹180 – ₹260', available_online: true, buy_url: 'https://krishisevakendra.in/general' },
  ],
};

function getPestInfo(pestName: string): PestInfo {
  const key = Object.keys(PEST_DB).find((k) =>
    pestName.toLowerCase().includes(k.toLowerCase())
  );
  return key ? PEST_DB[key] : DEFAULT_PEST_INFO;
}

// ─── Alert dispatcher ─────────────────────────────────────────────────────────

async function dispatchAlerts(report: PestReport, nearbyReports: PestReport[]) {
  // Browser Notification (hook: replace body with real email API call)
  if (nearbyReports.length === 0) return;

  const emailHookUrl = import.meta.env.VITE_EMAIL_SERVICE_URL as string | undefined;

  if (emailHookUrl) {
    try {
      await fetch(emailHookUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          subject: `🚨 Pest Alert: ${report.pest_name} detected near you`,
          pest: report.pest_name,
          severity: report.severity,
          location: report.location_name,
          measures: report.preventive_measures,
          pesticides: report.suggested_pesticides,
          nearby_count: nearbyReports.length,
        }),
      });
      console.info('[pestAlertService] Email alert dispatched via backend.');
    } catch (err) {
      console.warn('[pestAlertService] Email hook failed:', err);
    }
  }

  if ('Notification' in window && Notification.permission === 'granted') {
    new Notification(`🚨 Pest Alert: ${report.pest_name}`, {
      body: `Severity: ${report.severity} | ${nearbyReports.length} report(s) within ${ALERT_RADIUS_KM}km. Tap for preventive steps.`,
      icon: '/favicon.ico',
    });
  } else {
    console.warn('[pestAlertService] Pest alert (notification blocked):', report.pest_name);
  }
}

// ─── Public API ───────────────────────────────────────────────────────────────

export const pestAlertService = {
  KNOWN_PESTS: Object.keys(PEST_DB),

  /** Report a new pest event and alert nearby users */
  async reportPest(params: {
    uid: string;
    pest_name: string;
    severity: PestReport['severity'];
    lat: number;
    lon: number;
    location_name: string;
    crop_affected: string;
  }): Promise<PestReport> {
    const info = getPestInfo(params.pest_name);

    const report: PestReport = {
      id: `pest_${params.uid}_${Date.now()}`,
      ...params,
      preventive_measures: info.preventive_measures,
      suggested_pesticides: info.suggested_pesticides,
      reported_at: Date.now(),
      product_recommendations: info.products.map((p, i) => ({
        ...p,
        id: `prod_${i}_${Date.now()}`,
      })),
    };

    await firebaseService.savePestReport(report);

    // Find nearby existing reports = proxy for nearby users
    const nearby = await firebaseService.getNearbyPestReports(
      params.lat,
      params.lon,
      ALERT_RADIUS_KM
    );
    const neighbours = nearby.filter((r) => r.id !== report.id);

    await dispatchAlerts(report, neighbours);
    return report;
  },

  /** Get all pest reports near a given coordinate */
  async getNearbyAlerts(lat: number, lon: number): Promise<PestReport[]> {
    return firebaseService.getNearbyPestReports(lat, lon, ALERT_RADIUS_KM);
  },

  /** Get product recommendations for a pest */
  getProductRecommendations(pestName: string): ProductRecommendation[] {
    const info = getPestInfo(pestName);
    return info.products.map((p, i) => ({ ...p, id: `prod_${i}` }));
  },

  /** Get pest info (measures + pesticides) without creating a report */
  getPestInfo,

  ALERT_RADIUS_KM,
};
