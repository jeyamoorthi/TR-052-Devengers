import axios from "axios";

export const buildPrompt = (data) => {
  return `
FARMER DATA:
${JSON.stringify(data.farmer, null, 2)}

SOIL DATA:
${JSON.stringify(data.soil, null, 2)}

WEATHER:
${JSON.stringify(data.weather, null, 2)}

MARKET:
${JSON.stringify(data.market, null, 2)}

COMMUNITY ALERTS:
${JSON.stringify(data.alerts, null, 2)}

QUESTION:
${data.query}

Generate precise farm advisory in JSON format.
Adhere EXACTLY to the following structure:
{
  "advisory_text_english": "",
  "advisory_text_regional": "",
  "weekly_plan": {
    "irrigation": "",
    "fertilization": "",
    "pest_control": ""
  },
  "alerts": [
    ""
  ],
  "confidence_score": ""
}
`;
};

export const callGemini = async (prompt) => {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) throw new Error("Missing GEMINI_API_KEY");

  const res = await axios.post(
    `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${apiKey}`,
    {
      contents: [{ parts: [{ text: prompt }] }]
    }
  );

  const text = res.data.candidates?.[0]?.content?.parts?.[0]?.text;
  if (!text) {
    throw new Error("No text generated from Gemini");
  }

  // Remove markdown formatting if presents
  const jsonStr = text.replace(/```json/g, "").replace(/```/g, "").trim();
  
  try {
    return JSON.parse(jsonStr);
  } catch (e) {
    console.error("Failed to parse Gemini output as JSON", jsonStr);
    return null;
  }
};

export const validateResponse = (response) => {
  if (!response) return false;
  if (!response.weekly_plan) return false;
  if (parseFloat(response.confidence_score) < 0.5) return false;
  return true;
};
