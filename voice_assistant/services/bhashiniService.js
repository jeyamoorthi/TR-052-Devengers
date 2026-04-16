/**
 * SmartAgri+ Bhashini Translation Service — Node.js Backend
 *
 * Translates between English and Indian languages using Bhashini NMT pipeline.
 * Uses ULCA-compliant Bhashini APIs (same endpoint as the frontend service).
 */

import axios from 'axios';
import dotenv from 'dotenv';
dotenv.config();

const UDYATH_KEY = (process.env.BHASHINI_USER_ID || '').trim();
const API_KEY = (process.env.BHASHINI_API_KEY || '').trim();
const PIPELINE_CONFIG_URL = process.env.BHASHINI_PIPELINE_SRC ||
  'https://meity-auth.ulcacontrib.org/ulca/apis/v0/model/getModelsPipeline';
const COMPUTE_URL = process.env.BHASHINI_INFERENCE ||
  'https://dhruva-api.bhashini.gov.in/services/inference/pipeline';
const PIPELINE_ID = process.env.BHASHINI_PIPELINE_ID || '64392f96daac500b55c543cd';

// ISO 639-1 codes matching frontend Language enum
export const LANG_CODE_MAP = {
  en: 'en',
  hi: 'hi',
  ta: 'ta',
  te: 'te',
  ml: 'ml',
  kn: 'kn',
  mr: 'mr',
};

export const isAvailable = () => !!(UDYATH_KEY && API_KEY);

async function getPipelineConfig(sourceLang, targetLang) {
  if (!isAvailable()) {
    console.warn('[Bhashini] Missing keys — translation unavailable.');
    return null;
  }

  try {
    const { data } = await axios.post(
      PIPELINE_CONFIG_URL,
      {
        pipelineTasks: [
          { taskType: 'translation', config: { language: { sourceLanguage: sourceLang, targetLanguage: targetLang } } },
        ],
        pipelineRequestConfig: { pipelineId: PIPELINE_ID },
      },
      {
        headers: {
          'Content-Type': 'application/json',
          ulcaApiKey: UDYATH_KEY,
          userID: UDYATH_KEY,
        },
        timeout: 8000,
      }
    );
    return data;
  } catch (err) {
    console.error('[Bhashini] Pipeline config error:', err.message);
    return null;
  }
}

async function translateViaPipeline(text, sourceLang, targetLang) {
  const config = await getPipelineConfig(sourceLang, targetLang);
  if (!config) return null;

  const inferenceEndpoint = config.pipelineInferenceAPIEndPoint?.callbackUrl || COMPUTE_URL;
  const inferenceKey = config.pipelineInferenceAPIEndPoint?.inferenceApiKey?.value || API_KEY;
  const inferenceKeyName = config.pipelineInferenceAPIEndPoint?.inferenceApiKey?.name || 'Authorization';

  const translationConfig = config.pipelineResponseConfig?.find((c) => c.taskType === 'translation');
  const serviceId = translationConfig?.config?.[0]?.serviceId || '';

  try {
    const { data } = await axios.post(
      inferenceEndpoint,
      {
        pipelineTasks: [
          {
            taskType: 'translation',
            config: { language: { sourceLanguage: sourceLang, targetLanguage: targetLang }, serviceId },
          },
        ],
        inputData: { input: [{ source: text }] },
      },
      {
        headers: { 'Content-Type': 'application/json', [inferenceKeyName]: inferenceKey },
        timeout: 10000,
      }
    );

    const output = data?.pipelineResponse?.[0]?.output?.[0]?.target;
    return typeof output === 'string' ? output : null;
  } catch (err) {
    console.error('[Bhashini] Translation compute error:', err.message);
    return null;
  }
}

/**
 * Translate text from English to a target Indian language.
 * Falls back to original text on failure.
 */
export async function translateFromEnglish(text, targetLang) {
  if (!targetLang || targetLang === 'en') return text;
  if (!isAvailable()) return text;

  const targetCode = LANG_CODE_MAP[targetLang];
  if (!targetCode || targetCode === 'en') return text;

  const translated = await translateViaPipeline(text, 'en', targetCode);
  return translated || text;
}

/**
 * Translate text from an Indian language to English.
 * Falls back to original text on failure.
 */
export async function translateToEnglish(text, sourceLang) {
  if (!sourceLang || sourceLang === 'en') return text;
  if (!isAvailable()) return text;

  const sourceCode = LANG_CODE_MAP[sourceLang];
  if (!sourceCode || sourceCode === 'en') return text;

  const translated = await translateViaPipeline(text, sourceCode, 'en');
  return translated || text;
}
