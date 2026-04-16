export interface AqiSample {
  timestamp?: string;
  time?: number;
  aqi: number;
  diff?: number;
  fireCount?: number;
  windSpeed?: number;
  windDirection?: number;
  pm10?: number;
  pm25?: number;
  transportScore?: number;
}

export interface VulnerableRiskEntry {
  score: number;
  level: 'low' | 'moderate' | 'high' | 'severe';
  multiplier: number;
}

export interface ForecastInsight {
  slope: number;
  direction: 'rising' | 'falling' | 'stable';
  projected5min: number;
  projected30min: number;
  predictedStage5min: string;
  predictedStage30min: string;
  escalationEtaMinutes: number | null;
  anomaly: boolean;
  ratePerMin: number;
  exposureScore30min: number;
  dataPoints: number;
}

export interface AqiIntelligenceSnapshot {
  stationId: string;
  currentAqi: number;
  cpcbBand: string;
  grapStage: string;
  grapRawStage: string;
  grapDescription: string;
  previousStage: string;
  grapTransitioned: boolean;
  hysteresisPending: string | null;
  hysteresisCount: number;
  consecutiveWindows: number;
  remainingWindows: number;
  persistenceTriggered: boolean;
  forecast: ForecastInsight | null;
  vulnerableRisk: Record<string, VulnerableRiskEntry>;
  vulnerabilityMax: 'low' | 'moderate' | 'high' | 'severe';
  preemptiveAdvisory: string[];
  pollutionCause: string;
  causeConfidence: number;
  causeFactors: string[];
  eriScore: number;
  eriCategory: string;
  eriFactors: string[];
}

const PERSISTENCE_THRESHOLD = 3;
const HIGH_AQI_THRESHOLD = 300;
const HYSTERESIS_CONFIRMATIONS = 2;

const CPCB_BANDS: Array<[number, number, string]> = [
  [0, 50, 'Good'],
  [51, 100, 'Satisfactory'],
  [101, 200, 'Moderate'],
  [201, 300, 'Poor'],
  [301, 400, 'Very Poor'],
  [401, 500, 'Severe'],
];

const GRAP_STAGES: Array<[number, number, string, string]> = [
  [0, 100, 'None', 'No GRAP action required'],
  [101, 200, 'Stage I (Poor)', 'Actions under GRAP Stage I'],
  [201, 300, 'Stage II (Very Poor)', 'Actions under GRAP Stage II'],
  [301, 400, 'Stage III (Severe)', 'Actions under GRAP Stage III'],
  [401, 500, 'Stage IV (Severe+)', 'Emergency actions under GRAP Stage IV'],
];

const VULNERABILITY_MULTIPLIERS: Record<string, number> = {
  general: 1.0,
  elderly: 1.4,
  children: 1.6,
  respiratory: 1.8,
};

interface StageState {
  stage: string;
  pending: string | null;
  count: number;
}

interface StationRuntimeState {
  lastProcessedTime: number;
  consecutiveWindows: number;
  stageState: StageState;
}

const clamp = (value: number, min: number, max: number) => Math.max(min, Math.min(max, value));

const normalizeSampleTime = (sample: AqiSample) => {
  if (typeof sample.time === 'number' && Number.isFinite(sample.time)) return sample.time;
  if (sample.timestamp) {
    const parsed = Date.parse(sample.timestamp);
    if (!Number.isNaN(parsed)) return parsed;
  }
  return Date.now();
};

const average = (values: number[]) => {
  if (values.length === 0) return 0;
  return values.reduce((sum, value) => sum + value, 0) / values.length;
};

const computeSlope = (values: number[]) => {
  if (values.length < 2) return 0;
  const x = values.map((_, index) => index);
  const xMean = average(x);
  const yMean = average(values);
  const numerator = x.reduce((sum, xi, index) => sum + (xi - xMean) * (values[index] - yMean), 0);
  const denominator = x.reduce((sum, xi) => sum + (xi - xMean) ** 2, 0);
  if (denominator === 0) return 0;
  return numerator / denominator;
};

const stageForAqi = (aqi: number) => {
  for (const [lo, hi, stage, description] of GRAP_STAGES) {
    if (aqi >= lo && aqi <= hi) {
      return { stage, description };
    }
  }
  return { stage: 'Stage IV (Severe+)', description: 'Emergency actions under GRAP Stage IV' };
};

const cpcbBandForAqi = (aqi: number) => {
  for (const [lo, hi, label] of CPCB_BANDS) {
    if (aqi >= lo && aqi <= hi) return label;
  }
  return 'Severe';
};

const maxRiskLevel = (levels: Array<'low' | 'moderate' | 'high' | 'severe'>) => {
  if (levels.includes('severe')) return 'severe';
  if (levels.includes('high')) return 'high';
  if (levels.includes('moderate')) return 'moderate';
  return 'low';
};

const inferCause = (
  currentAqi: number,
  trendDirection: 'rising' | 'falling' | 'stable',
  sample: AqiSample
) => {
  const fireCount = sample.fireCount || 0;
  const windSpeed = sample.windSpeed || 0;
  const transportScore = sample.transportScore || 0;
  const pm10 = sample.pm10 || 0;
  const pm25 = sample.pm25 || 0;

  if (fireCount >= 30 && windSpeed >= 2 && trendDirection === 'rising') {
    return {
      pollutionCause: 'crop_burning_transport',
      causeConfidence: clamp(0.5 + fireCount / 120 + transportScore / 220, 0, 0.95),
      causeFactors: [
        `${fireCount} hotspot signals detected`,
        `Wind support: ${windSpeed.toFixed(1)} m/s`,
        `Transport score: ${transportScore}/100`,
      ],
    };
  }

  if (windSpeed < 2 && trendDirection === 'rising') {
    return {
      pollutionCause: 'local_accumulation',
      causeConfidence: 0.7,
      causeFactors: ['Low wind speed and rising AQI indicate local pollutant accumulation.'],
    };
  }

  if (pm10 > 0 && pm25 > 0 && pm10 / Math.max(pm25, 1) > 2.5 && currentAqi >= 150) {
    return {
      pollutionCause: 'dust_or_construction',
      causeConfidence: 0.65,
      causeFactors: [`High PM10/PM2.5 ratio (${(pm10 / Math.max(pm25, 1)).toFixed(1)}).`],
    };
  }

  if (currentAqi >= 200) {
    return {
      pollutionCause: 'mixed_sources',
      causeConfidence: 0.45,
      causeFactors: ['AQI elevated with mixed urban and local contributors.'],
    };
  }

  return {
    pollutionCause: 'background_pollution',
    causeConfidence: 0.3,
    causeFactors: ['No dominant causal signal detected.'],
  };
};

export class AqiIntelligenceEngine {
  private stationState = new Map<string, StationRuntimeState>();

  private ensureRuntime(stationId: string): StationRuntimeState {
    const existing = this.stationState.get(stationId);
    if (existing) return existing;

    const seeded: StationRuntimeState = {
      lastProcessedTime: 0,
      consecutiveWindows: 0,
      stageState: {
        stage: 'None',
        pending: null,
        count: 0,
      },
    };
    this.stationState.set(stationId, seeded);
    return seeded;
  }

  private updatePersistence(runtime: StationRuntimeState, aqi: number) {
    if (aqi >= HIGH_AQI_THRESHOLD) {
      runtime.consecutiveWindows += 1;
    } else {
      runtime.consecutiveWindows = 0;
    }

    return {
      consecutiveWindows: runtime.consecutiveWindows,
      remainingWindows: Math.max(0, PERSISTENCE_THRESHOLD - runtime.consecutiveWindows),
      persistenceTriggered: runtime.consecutiveWindows >= PERSISTENCE_THRESHOLD,
    };
  }

  private updateStage(runtime: StationRuntimeState, aqi: number) {
    const raw = stageForAqi(aqi);
    const previousStage = runtime.stageState.stage;
    let transitioned = false;

    if (raw.stage === runtime.stageState.stage) {
      runtime.stageState.pending = null;
      runtime.stageState.count = 0;
    } else if (raw.stage === runtime.stageState.pending) {
      runtime.stageState.count += 1;
      if (runtime.stageState.count >= HYSTERESIS_CONFIRMATIONS) {
        runtime.stageState.stage = raw.stage;
        runtime.stageState.pending = null;
        runtime.stageState.count = 0;
        transitioned = true;
      }
    } else {
      runtime.stageState.pending = raw.stage;
      runtime.stageState.count = 1;
    }

    return {
      grapStage: runtime.stageState.stage,
      grapRawStage: raw.stage,
      grapDescription: raw.description,
      previousStage,
      grapTransitioned: transitioned,
      hysteresisPending: runtime.stageState.pending,
      hysteresisCount: runtime.stageState.count,
    };
  }

  private computeForecast(samples: AqiSample[]): ForecastInsight | null {
    if (samples.length < 3) return null;

    const recent = samples.slice(-10);
    const values = recent.map((item) => item.aqi);
    const times = recent.map((item) => normalizeSampleTime(item));
    const slope = computeSlope(values);
    const intercept = average(values) - slope * average(values.map((_, index) => index));

    const projected5min = clamp(Math.round(intercept + slope * (values.length + 5)), 0, 500);
    const projected30min = clamp(Math.round(intercept + slope * (values.length + 30)), 0, 500);

    const direction: 'rising' | 'falling' | 'stable' =
      slope > 1.5 ? 'rising' : slope < -1.5 ? 'falling' : 'stable';

    const deltas: number[] = [];
    for (let index = 1; index < times.length; index += 1) {
      const delta = times[index] - times[index - 1];
      if (delta > 0) deltas.push(delta);
    }
    const avgDeltaMs = deltas.length > 0 ? average(deltas) : 60_000;
    const ratePerMin = Number((slope * (60_000 / avgDeltaMs)).toFixed(2));

    const current = values[values.length - 1];
    let escalationEtaMinutes: number | null = null;
    if (ratePerMin > 0 && current < HIGH_AQI_THRESHOLD) {
      escalationEtaMinutes = Number(((HIGH_AQI_THRESHOLD - current) / ratePerMin).toFixed(1));
      if (!Number.isFinite(escalationEtaMinutes) || escalationEtaMinutes < 0) {
        escalationEtaMinutes = null;
      }
    }

    const mean = average(values);
    const std = Math.sqrt(average(values.map((value) => (value - mean) ** 2)));
    const anomaly = std > 0 && Math.abs(current - mean) > 2 * std;

    return {
      slope: Number(slope.toFixed(2)),
      direction,
      projected5min,
      projected30min,
      predictedStage5min: stageForAqi(projected5min).stage,
      predictedStage30min: stageForAqi(projected30min).stage,
      escalationEtaMinutes,
      anomaly,
      ratePerMin,
      exposureScore30min: Math.round(projected30min * 0.6),
      dataPoints: values.length,
    };
  }

  private computeVulnerableRisk(
    forecast: ForecastInsight | null
  ): {
    vulnerableRisk: Record<string, VulnerableRiskEntry>;
    vulnerabilityMax: 'low' | 'moderate' | 'high' | 'severe';
  } {
    if (!forecast) {
      return { vulnerableRisk: {}, vulnerabilityMax: 'low' };
    }

    const vulnerableRisk: Record<string, VulnerableRiskEntry> = {};
    const levels: Array<'low' | 'moderate' | 'high' | 'severe'> = [];

    for (const [group, multiplier] of Object.entries(VULNERABILITY_MULTIPLIERS)) {
      const score = Math.round(forecast.projected30min * multiplier);
      const level: 'low' | 'moderate' | 'high' | 'severe' =
        score >= 300 ? 'severe' : score >= 200 ? 'high' : score >= 100 ? 'moderate' : 'low';
      vulnerableRisk[group] = { score, level, multiplier };
      levels.push(level);
    }

    return {
      vulnerableRisk,
      vulnerabilityMax: maxRiskLevel(levels),
    };
  }

  private computePreemptiveAdvisory(
    forecast: ForecastInsight | null,
    transportScore: number
  ): string[] {
    if (!forecast) return [];

    if (
      forecast.direction === 'rising' &&
      forecast.projected30min >= 200 &&
      transportScore >= 40
    ) {
      return [
        'Shift heavy field work to low-exposure windows (early morning/evening).',
        'Pause non-urgent spraying until AQI trend stabilizes.',
        'Alert nearby farmers to use masks during outdoor tasks.',
        'Keep irrigation and dust suppression tools ready.',
      ];
    }

    if (forecast.direction === 'rising' && forecast.projected30min >= 200) {
      return [
        'Reduce prolonged outdoor exposure for labor teams.',
        'Prefer covered transport for produce movement.',
      ];
    }

    if (forecast.direction === 'rising' && forecast.projected30min >= 150) {
      return ['Sensitive groups should reduce direct field exposure in peak hours.'];
    }

    return [];
  }

  private computeEri(
    currentAqi: number,
    consecutiveWindows: number,
    forecast: ForecastInsight | null,
    transportScore: number
  ) {
    let score = 0;
    const factors: string[] = [];

    if (currentAqi >= 200) {
      score += 40;
      factors.push('AQI >= 200 (+40)');
    }
    if (forecast && forecast.ratePerMin > 0.5) {
      score += 20;
      factors.push('Rate of change > 0.5 AQI/min (+20)');
    }
    if (consecutiveWindows >= 1) {
      score += 20;
      factors.push('Persistence >= 1 window (+20)');
    }
    if (transportScore > 50) {
      score += 10;
      factors.push('Transport score > 50 (+10)');
    }
    if (forecast && forecast.exposureScore30min > 150) {
      score += 10;
      factors.push('Exposure score > 150 (+10)');
    }

    score = clamp(score, 0, 100);
    const category =
      score >= 76 ? 'HIGH READINESS' : score >= 51 ? 'PRE-ESCALATION' : score >= 26 ? 'MONITOR' : 'LOW READINESS';

    return {
      eriScore: score,
      eriCategory: category,
      eriFactors: factors,
    };
  }

  process(stationId: string, samples: AqiSample[]): AqiIntelligenceSnapshot {
    const runtime = this.ensureRuntime(stationId);
    const sorted = [...samples].sort((a, b) => normalizeSampleTime(a) - normalizeSampleTime(b));
    const latest = sorted[sorted.length - 1] || { aqi: 0, time: Date.now() };

    let persistence = {
      consecutiveWindows: runtime.consecutiveWindows,
      remainingWindows: Math.max(0, PERSISTENCE_THRESHOLD - runtime.consecutiveWindows),
      persistenceTriggered: runtime.consecutiveWindows >= PERSISTENCE_THRESHOLD,
    };
    let stage = {
      grapStage: runtime.stageState.stage,
      grapRawStage: runtime.stageState.stage,
      grapDescription: stageForAqi(latest.aqi).description,
      previousStage: runtime.stageState.stage,
      grapTransitioned: false,
      hysteresisPending: runtime.stageState.pending,
      hysteresisCount: runtime.stageState.count,
    };

    for (const sample of sorted) {
      const t = normalizeSampleTime(sample);
      if (t <= runtime.lastProcessedTime) continue;
      persistence = this.updatePersistence(runtime, sample.aqi);
      stage = this.updateStage(runtime, sample.aqi);
      runtime.lastProcessedTime = t;
    }

    const forecast = this.computeForecast(sorted);
    const transportScore = latest.transportScore || 0;
    const vulnerable = this.computeVulnerableRisk(forecast);
    const preemptiveAdvisory = this.computePreemptiveAdvisory(forecast, transportScore);
    const cause = inferCause(latest.aqi, forecast?.direction || 'stable', latest);
    const eri = this.computeEri(latest.aqi, persistence.consecutiveWindows, forecast, transportScore);

    return {
      stationId,
      currentAqi: latest.aqi,
      cpcbBand: cpcbBandForAqi(latest.aqi),
      grapStage: stage.grapStage,
      grapRawStage: stage.grapRawStage,
      grapDescription: stage.grapDescription,
      previousStage: stage.previousStage,
      grapTransitioned: stage.grapTransitioned,
      hysteresisPending: stage.hysteresisPending,
      hysteresisCount: stage.hysteresisCount,
      consecutiveWindows: persistence.consecutiveWindows,
      remainingWindows: persistence.remainingWindows,
      persistenceTriggered: persistence.persistenceTriggered,
      forecast,
      vulnerableRisk: vulnerable.vulnerableRisk,
      vulnerabilityMax: vulnerable.vulnerabilityMax,
      preemptiveAdvisory,
      pollutionCause: cause.pollutionCause,
      causeConfidence: Number(cause.causeConfidence.toFixed(2)),
      causeFactors: cause.causeFactors,
      eriScore: eri.eriScore,
      eriCategory: eri.eriCategory,
      eriFactors: eri.eriFactors,
    };
  }
}

export const aqiIntelligenceEngine = new AqiIntelligenceEngine();
