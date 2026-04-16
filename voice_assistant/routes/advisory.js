/**
 * SmartAgri+ Weekly Advisory Route
 * POST /api/voice-assistant/advisory
 *
 * Body:
 *   { farmer: FarmerProfile, query?: string, language?: string }
 *
 * Response:
 *   {
 *     advisory_text_english: string,
 *     advisory_text_regional: string,
 *     weekly_plan: { irrigation, fertilization, pest_control },
 *     alerts: string[],
 *     confidence_score: string
 *   }
 *
 * Generates a full structured weekly farm advisory using the SmartAdvisory Engine.
 * Optionally translates the response for non-English farmers via Bhashini.
 */

import express from 'express';
import { generateAdvisory } from '../services/advisoryEngine.js';
import { translateFromEnglish, isAvailable } from '../services/bhashiniService.js';

const router = express.Router();

router.post('/', async (req, res) => {
  const { farmer, query, language } = req.body;

  if (!farmer) {
    return res.status(400).json({ error: 'farmer profile is required.' });
  }

  try {
    // 1. Generate the full structured advisory
    const advisory = await generateAdvisory(farmer, query || '');

    // 2. Translate advisory text to regional language if requested
    if (language && language !== 'en') {
      if (isAvailable()) {
        try {
          advisory.advisory_text_regional = await translateFromEnglish(
            advisory.advisory_text_english,
            language
          );
        } catch {
          advisory.advisory_text_regional = advisory.advisory_text_english;
        }
      } else {
        advisory.advisory_text_regional = advisory.advisory_text_english;
      }
    }

    return res.json(advisory);
  } catch (err) {
    console.error('[AdvisoryRoute] Error:', err.message);
    return res.status(500).json({ error: 'Advisory generation failed. Please try again.' });
  }
});

export default router;
