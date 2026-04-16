/**
 * SmartAgri+ Voice Assistant Server
 *
 * Standalone Express service on port 8001.
 * Provides the backend for voice/chat assistant in the SmartAgri app.
 *
 * Routes:
 *   POST /api/voice-assistant/chat      → Q&A grounded in advisory engine
 *   POST /api/voice-assistant/advisory  → Full weekly farm advisory (JSON)
 *   GET  /health                        → Health check
 */

import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import chatRoute from './routes/chat.js';
import advisoryRoute from './routes/advisory.js';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 8001;
const FRONTEND_URL = process.env.FRONTEND_URL || 'http://localhost:3000';

// ─── Middleware ───────────────────────────────────────────────────────────────
app.use(cors({
  origin: [FRONTEND_URL, 'http://localhost:3000', 'http://localhost:5173'],
  methods: ['GET', 'POST'],
  allowedHeaders: ['Content-Type', 'Authorization'],
}));
app.use(express.json({ limit: '2mb' }));

// ─── Routes ───────────────────────────────────────────────────────────────────
app.use('/api/voice-assistant/chat', chatRoute);
app.use('/api/voice-assistant/advisory', advisoryRoute);

// ─── Health ───────────────────────────────────────────────────────────────────
app.get('/health', (req, res) => {
  res.json({
    status: 'ok',
    service: 'SmartAgri+ Voice Assistant Backend',
    version: '1.0.0',
    gemini: !!process.env.GEMINI_API_KEY,
    bhashini: !!(process.env.BHASHINI_USER_ID && process.env.BHASHINI_API_KEY),
    timestamp: new Date().toISOString(),
  });
});

// ─── Root ─────────────────────────────────────────────────────────────────────
app.get('/', (req, res) => {
  res.send('SmartAgri+ Voice Assistant Backend is running on port ' + PORT);
});

// ─── Start ────────────────────────────────────────────────────────────────────
app.listen(PORT, () => {
  console.log(`\n🌱 SmartAgri+ Voice Assistant Backend`);
  console.log(`   Running at: http://localhost:${PORT}`);
  console.log(`   Gemini AI:  ${process.env.GEMINI_API_KEY ? '✅ configured' : '⚠️  missing — using offline fallback'}`);
  console.log(`   Bhashini:   ${(process.env.BHASHINI_USER_ID && process.env.BHASHINI_API_KEY) ? '✅ configured' : '⚠️  missing — English only'}`);
  console.log(`\n   Endpoints:`);
  console.log(`   POST /api/voice-assistant/chat`);
  console.log(`   POST /api/voice-assistant/advisory`);
  console.log(`   GET  /health\n`);
});
