import { UserProfile } from '../types';

export interface MarketIntelligence {
  crop: string;
  currentPricePerQuintal: number;
  mspPriceINR: number;
  trend: 'Rising' | 'Falling' | 'Stable';
  trendPercent: number;
  bestTimeToSell: string;
  predictedPeakMonth: string;
  potentialProfitINR: number;
}

export interface GovtScheme {
  id: string;
  name: string;
  category: 'Subsidy' | 'Insurance' | 'Credit' | 'Technology';
  benefit: string;
  benefitINR: string;
  eligibility: string;
  howToApply: string;
  color: string;
  icon: string;
  eligible: boolean;
}

export interface IncomeSummary {
  cropRevenue: number;
  carbonCreditValue: number;
  schemesBenefit: number;
  totalPotentialINR: number;
  marketIntelligence: MarketIntelligence;
  schemes: GovtScheme[];
  profitInsights: string[];
}

const MARKET_PRICES: Record<string, { price: number; msp: number; trend: 'Rising' | 'Falling' | 'Stable'; peakMonth: string }> = {
  Rice: { price: 2400, msp: 2183, trend: 'Stable', peakMonth: 'December' },
  Wheat: { price: 2150, msp: 2275, trend: 'Rising', peakMonth: 'May' },
  Maize: { price: 1900, msp: 1962, trend: 'Rising', peakMonth: 'October' },
  Millet: { price: 2500, msp: 2500, trend: 'Rising', peakMonth: 'November' },
  Cotton: { price: 7200, msp: 7020, trend: 'Stable', peakMonth: 'February' },
  Sugarcane: { price: 3400, msp: 3150, trend: 'Stable', peakMonth: 'March' },
  Soybean: { price: 4800, msp: 4600, trend: 'Rising', peakMonth: 'November' },
  Groundnut: { price: 5800, msp: 6377, trend: 'Rising', peakMonth: 'December' },
  Tomato: { price: 1800, msp: 0, trend: 'Falling', peakMonth: 'July' },
  Pulses: { price: 7500, msp: 7000, trend: 'Rising', peakMonth: 'April' },
};

const ALL_SCHEMES: GovtScheme[] = [
  {
    id: 'pmkisan',
    name: 'PM-KISAN',
    category: 'Subsidy',
    benefit: '₹6,000/year direct transfer to farmer bank account',
    benefitINR: '₹6,000',
    eligibility: 'All land-holding farmers',
    howToApply: 'pmkisan.gov.in or nearest CSC centre',
    color: '#16a34a',
    icon: '🌾',
    eligible: true,
  },
  {
    id: 'pmfby',
    name: 'PM Fasal Bima Yojana',
    category: 'Insurance',
    benefit: 'Crop insurance covering up to 80% of crop loss',
    benefitINR: 'Up to ₹2L',
    eligibility: 'All farmers with registered crop land',
    howToApply: 'pmfby.gov.in or nearest bank branch',
    color: '#2563eb',
    icon: '🛡️',
    eligible: true,
  },
  {
    id: 'soilhealth',
    name: 'Soil Health Card Scheme',
    category: 'Technology',
    benefit: 'Free soil testing + fertilizer recommendations',
    benefitINR: 'Free',
    eligibility: 'All farmers — apply once every 2 years',
    howToApply: 'soilhealth.dac.gov.in or Krishi Vigyan Kendra',
    color: '#92400e',
    icon: '🌍',
    eligible: true,
  },
  {
    id: 'kcc',
    name: 'Kisan Credit Card',
    category: 'Credit',
    benefit: 'Revolving credit up to ₹3L at 4% interest p.a.',
    benefitINR: 'Up to ₹3L credit',
    eligibility: 'Farmers with 2+ years farming experience',
    howToApply: 'Any nationalized bank or cooperative bank branch',
    color: '#7c3aed',
    icon: '💳',
    eligible: true,
  },
  {
    id: 'drip',
    name: 'PMKSY Drip Irrigation',
    category: 'Technology',
    benefit: '55–85% subsidy on drip/sprinkler installation',
    benefitINR: '55-85% subsidy',
    eligibility: 'All farmers; priority to small & marginal farmers',
    howToApply: 'pmksy.gov.in or State Horticulture Department',
    color: '#0891b2',
    icon: '💧',
    eligible: true,
  },
  {
    id: 'enam',
    name: 'e-NAM Marketplace',
    category: 'Technology',
    benefit: 'Sell crops online at better prices (5–15% premium)',
    benefitINR: '5–15% price premium',
    eligibility: 'Farmers with Aadhaar + bank account',
    howToApply: 'enam.gov.in — register using Aadhaar',
    color: '#db2777',
    icon: '📱',
    eligible: true,
  },
];

export const financeService = {
  getIncomeSummary(user: UserProfile, carbonValueINR: number): IncomeSummary {
    const crop = user.primaryCrop || 'Wheat';
    const farmSize = user.farmSizeAcres || 2;

    // Find market data (fuzzy match)
    const marketKey = Object.keys(MARKET_PRICES).find(k =>
      crop.toLowerCase().includes(k.toLowerCase())
    ) || 'Wheat';
    const market = MARKET_PRICES[marketKey];

    // Average yield: ~20 quintals/acre for most crops
    const avgYieldQuintals = farmSize * 18;
    const cropRevenue = avgYieldQuintals * market.price;

    const trendPercent = market.trend === 'Rising' ? 8.5 :
      market.trend === 'Falling' ? -5.2 : 1.1;

    const marketIntelligence: MarketIntelligence = {
      crop,
      currentPricePerQuintal: market.price,
      mspPriceINR: market.msp,
      trend: market.trend,
      trendPercent,
      bestTimeToSell: market.trend === 'Rising' ? `Wait until ${market.peakMonth} for peak price` : 'Sell now at current rates',
      predictedPeakMonth: market.peakMonth,
      potentialProfitINR: Math.floor(cropRevenue * (1 + trendPercent / 100)) - cropRevenue,
    };

    // Schemes (filter by eligibility — all eligible in demo)
    const schemes = ALL_SCHEMES;
    const schemesBenefit = 6000 + 3000; // PM-KISAN + approximate insurance benefit

    const totalPotentialINR = Math.floor(cropRevenue + carbonValueINR + schemesBenefit);

    const profitInsights: string[] = [];
    if (market.trend === 'Rising') {
      profitInsights.push(`📈 ${crop} prices rising — expected to peak in ${market.peakMonth}. Consider storing.`);
    }
    if (market.price > market.msp) {
      profitInsights.push(`✅ Current market price (₹${market.price}) is above MSP (₹${market.msp}) — good time to sell.`);
    } else {
      profitInsights.push(`⚠️ Market price below MSP — sell to government procurement at ₹${market.msp}/quintal.`);
    }
    if (carbonValueINR > 0) {
      profitInsights.push(`♻️ Your sustainable practices unlock ₹${carbonValueINR.toLocaleString('en-IN')} in carbon credit earnings.`);
    }
    profitInsights.push(`🏦 Register on e-NAM to get 8–12% better prices than local mandi.`);

    return {
      cropRevenue,
      carbonCreditValue: carbonValueINR,
      schemesBenefit,
      totalPotentialINR,
      marketIntelligence,
      schemes,
      profitInsights,
    };
  },
};
