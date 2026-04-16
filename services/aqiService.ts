import { aqiIntelligenceEngine, AqiIntelligenceSnapshot } from './aqiIntelligenceEngine';
import { integrationConfig } from './integrationConfig';

export interface AqiRecord {
  timestamp: string;
  aqi: number;
  diff: number;
  time: number;
  fireCount?: number;
  windSpeed?: number;
  windDirection?: number;
  pm10?: number;
  pm25?: number;
  transportScore?: number;
}

const STATION_ID = 'smartagri-main';

const mulberry32 = (seed: number) => {
  let a = seed >>> 0;
  return () => {
    a += 0x6d2b79f5;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t ^= t + Math.imul(t ^ (t >>> 7), 61 | t);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
};

const random = mulberry32(9237348);
let fallbackSeries: AqiRecord[] = [];

const parseLineRecord = (line: string): AqiRecord | null => {
  try {
    const parsed = JSON.parse(line);
    if (typeof parsed.aqi !== 'number') return null;
    const time = typeof parsed.time === 'number' ? parsed.time : Date.parse(String(parsed.timestamp || ''));
    const safeTime = Number.isFinite(time) ? time : Date.now();
    return {
      timestamp: parsed.timestamp || new Date(safeTime).toISOString(),
      aqi: Math.round(parsed.aqi),
      diff: typeof parsed.diff === 'number' ? parsed.diff : 0,
      time: safeTime,
      fireCount: typeof parsed.fire_count === 'number' ? parsed.fire_count : undefined,
      windSpeed: typeof parsed.wind_speed === 'number' ? parsed.wind_speed : undefined,
      windDirection: typeof parsed.wind_direction === 'number' ? parsed.wind_direction : undefined,
      pm10: typeof parsed.pm10 === 'number' ? parsed.pm10 : undefined,
      pm25: typeof parsed.pm25 === 'number' ? parsed.pm25 : undefined,
      transportScore: typeof parsed.transport_score === 'number' ? parsed.transport_score : undefined,
    };
  } catch {
    return null;
  }
};

const parseFeedPayload = (raw: string): AqiRecord[] => {
  const trimmed = raw.trim();
  if (!trimmed) return [];

  if (trimmed.startsWith('[')) {
    try {
      const parsed = JSON.parse(trimmed);
      if (!Array.isArray(parsed)) return [];
      return parsed
        .map((entry) => parseLineRecord(JSON.stringify(entry)))
        .filter((entry): entry is AqiRecord => Boolean(entry));
    } catch {
      return [];
    }
  }

  return trimmed
    .split('\n')
    .map((line) => parseLineRecord(line.trim()))
    .filter((entry): entry is AqiRecord => Boolean(entry));
};

const normalizeSeries = (records: AqiRecord[]) =>
  records
    .slice()
    .sort((a, b) => a.time - b.time)
    .filter((item, index, array) => index === 0 || item.time !== array[index - 1].time);

const seedFallbackSeries = () => {
  if (fallbackSeries.length > 0) return;

  const now = Date.now();
  const baseAqi = 165;
  let previousAqi = baseAqi;
  fallbackSeries = Array.from({ length: 22 }).map((_, index) => {
    const drift = Math.round((random() - 0.45) * 11);
    const wave = Math.round(Math.sin(index / 3) * 8);
    const aqi = Math.max(75, Math.min(360, baseAqi + wave + drift));
    const time = now - (21 - index) * 60_000;
    const diff = index === 0 ? 0 : aqi - previousAqi;
    previousAqi = aqi;
    return {
      timestamp: new Date(time).toISOString(),
      aqi,
      diff,
      time,
      windSpeed: Number((1 + random() * 4.5).toFixed(1)),
      windDirection: Math.round(random() * 360),
      fireCount: random() > 0.8 ? Math.round(random() * 40) : Math.round(random() * 6),
      pm10: Math.round(aqi * 1.25),
      pm25: Math.round(aqi * 0.72),
      transportScore: Math.round(random() * 100),
    };
  });
};

const nextFallbackPoint = () => {
  seedFallbackSeries();

  const last = fallbackSeries[fallbackSeries.length - 1];
  const jitter = Math.round((random() - 0.5) * 14);
  const trendBoost = random() > 0.62 ? Math.round(random() * 10) : -Math.round(random() * 7);
  const nextAqi = Math.max(60, Math.min(430, last.aqi + jitter + trendBoost));
  const nextTime = Math.max(Date.now(), last.time + 60_000);

  const next: AqiRecord = {
    timestamp: new Date(nextTime).toISOString(),
    aqi: nextAqi,
    diff: nextAqi - last.aqi,
    time: nextTime,
    windSpeed: Number((1 + random() * 5).toFixed(1)),
    windDirection: Math.round(random() * 360),
    fireCount: random() > 0.84 ? Math.round(20 + random() * 45) : Math.round(random() * 8),
    pm10: Math.round(nextAqi * (1.2 + random() * 0.5)),
    pm25: Math.round(nextAqi * (0.55 + random() * 0.4)),
    transportScore: Math.round(random() * 100),
  };

  fallbackSeries.push(next);
  fallbackSeries = fallbackSeries.slice(-40);
};

const getFallbackData = (): AqiRecord[] => {
  nextFallbackPoint();
  return normalizeSeries(fallbackSeries);
};

const getRemoteData = async (): Promise<{ records: AqiRecord[]; source: string } | null> => {
  const candidates = [
    integrationConfig.aqiFeedUrl,
    integrationConfig.aqiDashboardUrl ? `${integrationConfig.aqiDashboardUrl}/aqi_output.json` : '',
  ].filter(Boolean);

  for (const url of candidates) {
    try {
      const response = await fetch(url, { cache: 'no-store' });
      if (!response.ok) continue;
      const text = await response.text();
      const parsed = normalizeSeries(parseFeedPayload(text));
      if (parsed.length > 0) {
        return { records: parsed.slice(-40), source: url };
      }
    } catch {
      // Continue to next candidate.
    }
  }

  return null;
};

export const aqiService = {
  getAqiLevel(aqi: number) {
    if (aqi <= 50) return { label: 'Good', color: '#16a34a' };
    if (aqi <= 100) return { label: 'Satisfactory', color: '#65a30d' };
    if (aqi <= 200) return { label: 'Moderate', color: '#ca8a04' };
    if (aqi <= 300) return { label: 'Poor', color: '#ea580c' };
    if (aqi <= 400) return { label: 'Very Poor', color: '#dc2626' };
    return { label: 'Severe', color: '#991b1b' };
  },

  async getLatestRecords(): Promise<{
    records: AqiRecord[];
    source: string;
    intelligence: AqiIntelligenceSnapshot;
  }> {
    const remote = await getRemoteData();
    const records = remote?.records || getFallbackData();
    const source = remote?.source || 'smartagri-local-simulator';
    const intelligence = aqiIntelligenceEngine.process(STATION_ID, records);

    return {
      records,
      source,
      intelligence,
    };
  },
};
