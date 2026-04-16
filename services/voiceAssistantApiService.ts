/**
 * voiceAssistantApiService.ts
 *
 * Thin HTTP client that connects the SmartAgri React frontend
 * to the voice_assistant Node.js backend (port 8001).
 *
 * Automatically falls back to the local Gemini service if the
 * backend is unreachable (keeps offline behavior intact).
 */

import { UserProfile, Language } from '../types';
import { AdvisoryOutput } from './smartAdvisoryEngine';

const BASE_URL = (import.meta.env.VITE_VOICE_ASSISTANT_URL || 'http://localhost:8001').replace(/\/$/, '');

// ─── Types ────────────────────────────────────────────────────────────────────

interface ChatResponse {
  reply: string;
  reply_english?: string;
  language: string;
}

// ─── HTTP helpers ─────────────────────────────────────────────────────────────

async function post<T>(path: string, body: object, timeoutMs = 15_000): Promise<T> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const res = await fetch(`${BASE_URL}${path}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
      signal: controller.signal,
    });

    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err?.error || `HTTP ${res.status}`);
    }

    return res.json() as Promise<T>;
  } finally {
    clearTimeout(timer);
  }
}

// ─── Public API ───────────────────────────────────────────────────────────────

export const voiceAssistantApi = {
  /**
   * Health-check the voice_assistant backend.
   * Returns true if the service is reachable.
   */
  async isOnline(): Promise<boolean> {
    try {
      const res = await fetch(`${BASE_URL}/health`, { signal: AbortSignal.timeout(3000) });
      return res.ok;
    } catch {
      return false;
    }
  },

  /**
   * Send a chat/voice query to the advisory backend.
   * Returns the localized text response.
   */
  async chat(
    farmer: UserProfile,
    query: string,
    language: Language,
  ): Promise<string> {
    const data = await post<ChatResponse>('/api/voice-assistant/chat', {
      farmer,
      query,
      language,
    });
    return data.reply;
  },

  /**
   * Request a full structured weekly advisory from the backend.
   * Returns the AdvisoryOutput JSON.
   */
  async generateAdvisory(
    farmer: UserProfile,
    query: string,
    language: Language,
  ): Promise<AdvisoryOutput> {
    return post<AdvisoryOutput>('/api/voice-assistant/advisory', {
      farmer,
      query,
      language,
    });
  },
};
