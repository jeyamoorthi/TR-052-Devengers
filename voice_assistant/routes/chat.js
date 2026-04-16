/**
 * SmartAgri+ Chat Route
 * POST /api/voice-assistant/chat
 *
 * Body:
 *   { farmer: FarmerProfile, query: string, language: string }
 *
 * Response:
 *   { reply: string, language: string }
 *
 * Handles both typed text and voice-transcribed text queries.
 * Routes through the SmartAdvisory Engine grounded in real-time context.
 */

import express from 'express';
import { askQuestion } from '../services/advisoryEngine.js';
import { translateFromEnglish, translateToEnglish, isAvailable } from '../services/bhashiniService.js';

const router = express.Router();

router.post('/', async (req, res) => {
  const { farmer, query, language } = req.body;

  // Validate
  if (!farmer || !query?.trim()) {
    return res.status(400).json({ error: 'farmer profile and query are required.' });
  }

  try {
    // 1. If query is in a regional language, translate to English first
    let englishQuery = query.trim();
    if (language && language !== 'en' && isAvailable()) {
      englishQuery = await translateToEnglish(query.trim(), language);
    }

    // 2. Get advisory answer grounded in farmer context
    let answer = await askQuestion(farmer, englishQuery);

    // 3. Translate reply back to requested language
    if (language && language !== 'en') {
      const translated = await translateFromEnglish(answer, language);
      return res.json({ reply: translated, reply_english: answer, language });
    }

    return res.json({ reply: answer, language: 'en' });
  } catch (err) {
    console.error('[ChatRoute] Error:', err.message);
    return res.status(500).json({ error: 'Advisory engine failed. Please try again.' });
  }
});

export default router;
