import { GoogleGenAI } from "@google/genai";
import { Language, UserProfile } from "../types";
import { smartAdvisoryEngine, AdvisoryOutput } from "./smartAdvisoryEngine";
import { bhashiniService } from "./bhashiniService";

const modelId = "gemini-2.5-flash";
const apiKey = import.meta.env.VITE_GEMINI_API_KEY?.trim() || "";

const getAiClient = () => {
  if (!apiKey) {
    return null;
  }

  return new GoogleGenAI({ apiKey });
};

export const geminiService = {
  /**
   * Translates or simplifies content using Gemini.
   * STRICT: This function does not invent advice. It only processes the input text.
   */
  async processText(text: string, targetLang: Language, task: 'simplify' | 'translate'): Promise<string> {
    const ai = getAiClient();
    if (!ai) {
      return "API key missing. Using offline fallback.";
    }

    const prompt = `
      Task: ${task === 'simplify' ? 'Simplify for a farmer' : 'Translate'} 
      Target Language: ${targetLang}
      Content: "${text}"
      
      Constraint: strictly maintain the meaning. Do not add new facts. Output only the result.
    `;

    try {
      const response = await ai.models.generateContent({
        model: modelId,
        contents: prompt,
      });
      return response.text || text;
    } catch (error) {
      console.error("Gemini Error:", error);
      return text; // Fallback to original text
    }
  },

  /**
   * Chat assistant that is grounded in the current app context (Weather, Disease, etc).
   * Now powered by the SmartAdvisoryEngine when a user profile is available.
   */
  async askAssistant(query: string, context: string, lang: Language, user?: UserProfile | null): Promise<string> {
    // If we have a full user profile, route through the advisory engine for
    // richer, personalized, context-grounded responses.
    if (user && user.name && user.location?.lat) {
      try {
        return await smartAdvisoryEngine.askQuestion(user, query, lang);
      } catch (err) {
        console.warn("[geminiService] Advisory engine failed, falling back:", err);
      }
    }

    // Fallback to the basic Gemini call
    const ai = getAiClient();
    if (!ai) {
      return "I am offline right now. Please set VITE_GEMINI_API_KEY for AI responses.";
    }

    const systemInstruction = `
      You are SmartAgri+, a helpful farming assistant.
      Current Language: ${lang}
      
      RULES:
      1. Answer ONLY based on the provided CONTEXT.
      2. If the answer is not in the context, say "I don't have that information currently."
      3. Keep answers short, simple, and actionable for a farmer.
      4. Do not hallucinate treatments or weather data not provided.
    `;

    try {
      const response = await ai.models.generateContent({
        model: modelId,
        contents: `CONTEXT: ${context}\n\nUSER QUESTION: ${query}`,
        config: {
          systemInstruction: systemInstruction
        }
      });
      return response.text || "I couldn't understand that.";
    } catch (error) {
      console.error("Assistant Error:", error);
      return "Service unavailable.";
    }
  },

  /**
   * Generate a full structured advisory for a farmer.
   * This is the primary entry point for the advisory pipeline.
   */
  async generateAdvisory(user: UserProfile, query: string, lang: Language): Promise<AdvisoryOutput> {
    return smartAdvisoryEngine.generateAdvisory(user, query, lang);
  },
};
