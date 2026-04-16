import { Language } from '../types';

/**
 * Bhashini NMT (Neural Machine Translation) Service
 * Uses ULCA-compliant Bhashini APIs for Indian-language translation.
 *
 * Keys:
 *   VITE_BHASHINI_UDYATH_KEY  – userID / authorization header
 *   VITE_BHASHINI_API_KEY     – Meity Bhashini inference API key
 */

const UDYATH_KEY = (import.meta.env.VITE_BHASHINI_UDYATH_KEY || '').trim();
const API_KEY = (import.meta.env.VITE_BHASHINI_API_KEY || '').trim();

// Bhashini uses ISO 639-1 codes for Indic languages
const LANG_CODE_MAP: Record<Language, string> = {
  [Language.EN]: 'en',
  [Language.HI]: 'hi',
  [Language.TA]: 'ta',
  [Language.TE]: 'te',
  [Language.ML]: 'ml',
  [Language.KN]: 'kn',
  [Language.MR]: 'mr',
};

// Bhashini pipeline config endpoint
const PIPELINE_CONFIG_URL = 'https://meity-auth.ulcacontrib.org/ulca/apis/v0/model/getModelsPipeline';
// Bhashini ASR/NMT/TTS compute endpoint
const COMPUTE_URL = 'https://dhruva-api.bhashini.gov.in/services/inference/pipeline';

interface BhashiniPipelineConfig {
  pipelineInferenceAPIEndPoint?: {
    callbackUrl?: string;
    inferenceApiKey?: { name?: string; value?: string };
  };
  pipelineResponseConfig?: Array<{
    taskType?: string;
    config?: Array<{
      serviceId?: string;
      modelId?: string;
      language?: { sourceLanguage?: string; targetLanguage?: string };
    }>;
  }>;
}

/**
 * Fetches the Bhashini NMT pipeline configuration for a given source→target pair.
 * This tells us which model/service to use for translation.
 */
async function getPipelineConfig(
  sourceLang: string,
  targetLang: string,
): Promise<BhashiniPipelineConfig | null> {
  if (!UDYATH_KEY || !API_KEY) {
    console.warn('[Bhashini] Missing API keys – translation unavailable.');
    return null;
  }

  try {
    const response = await fetch(PIPELINE_CONFIG_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ulcaApiKey: UDYATH_KEY,
        userID: UDYATH_KEY,
      },
      body: JSON.stringify({
        pipelineTasks: [{ taskType: 'translation', config: { language: { sourceLanguage: sourceLang, targetLanguage: targetLang } } }],
        pipelineRequestConfig: { pipelineId: '64392f96daac500b55c543cd' },
      }),
    });

    if (!response.ok) {
      console.error('[Bhashini] Pipeline config fetch failed:', response.status);
      return null;
    }

    return (await response.json()) as BhashiniPipelineConfig;
  } catch (err) {
    console.error('[Bhashini] Pipeline config error:', err);
    return null;
  }
}

/**
 * Translates text using the Bhashini NMT pipeline.
 */
async function translateViaPipeline(
  text: string,
  sourceLang: string,
  targetLang: string,
): Promise<string | null> {
  const config = await getPipelineConfig(sourceLang, targetLang);
  if (!config) return null;

  const inferenceEndpoint = config.pipelineInferenceAPIEndPoint?.callbackUrl || COMPUTE_URL;
  const inferenceKey =
    config.pipelineInferenceAPIEndPoint?.inferenceApiKey?.value || API_KEY;
  const inferenceKeyName =
    config.pipelineInferenceAPIEndPoint?.inferenceApiKey?.name || 'Authorization';

  // Find the NMT service config
  const translationConfig = config.pipelineResponseConfig?.find(
    (c) => c.taskType === 'translation',
  );
  const serviceId = translationConfig?.config?.[0]?.serviceId || '';

  try {
    const response = await fetch(inferenceEndpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        [inferenceKeyName]: inferenceKey,
      },
      body: JSON.stringify({
        pipelineTasks: [
          {
            taskType: 'translation',
            config: {
              language: { sourceLanguage: sourceLang, targetLanguage: targetLang },
              serviceId,
            },
          },
        ],
        inputData: {
          input: [{ source: text }],
        },
      }),
    });

    if (!response.ok) {
      console.error('[Bhashini] Translation request failed:', response.status);
      return null;
    }

    const result = await response.json();
    const output = result?.pipelineResponse?.[0]?.output?.[0]?.target;
    return typeof output === 'string' ? output : null;
  } catch (err) {
    console.error('[Bhashini] Translation compute error:', err);
    return null;
  }
}

export const bhashiniService = {
  /**
   * Check if Bhashini keys are configured.
   */
  isAvailable(): boolean {
    return !!(UDYATH_KEY && API_KEY);
  },

  /**
   * Translate text from English to target language using Bhashini NMT.
   * Falls back to the original text if translation fails.
   */
  async translateFromEnglish(text: string, targetLang: Language): Promise<string> {
    if (targetLang === Language.EN) return text;
    if (!this.isAvailable()) return text;

    const targetCode = LANG_CODE_MAP[targetLang];
    if (!targetCode || targetCode === 'en') return text;

    const translated = await translateViaPipeline(text, 'en', targetCode);
    return translated || text;
  },

  /**
   * Translate text from any Indic language to English using Bhashini NMT.
   * Falls back to the original text if translation fails.
   */
  async translateToEnglish(text: string, sourceLang: Language): Promise<string> {
    if (sourceLang === Language.EN) return text;
    if (!this.isAvailable()) return text;

    const sourceCode = LANG_CODE_MAP[sourceLang];
    if (!sourceCode || sourceCode === 'en') return text;

    const translated = await translateViaPipeline(text, sourceCode, 'en');
    return translated || text;
  },

  /**
   * Translate text between any two supported languages.
   */
  async translate(text: string, from: Language, to: Language): Promise<string> {
    if (from === to) return text;
    if (!this.isAvailable()) return text;

    const sourceCode = LANG_CODE_MAP[from];
    const targetCode = LANG_CODE_MAP[to];
    if (!sourceCode || !targetCode) return text;

    const translated = await translateViaPipeline(text, sourceCode, targetCode);
    return translated || text;
  },
};
