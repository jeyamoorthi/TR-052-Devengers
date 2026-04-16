import express from "express";
import { Farmer } from "../models/Farmer.js";
import { Alert } from "../models/Alert.js";
import { getSoilData } from "../services/soilService.js";
import { getWeather } from "../services/weatherService.js";
import { getMarketData } from "../services/marketService.js";
import { buildPrompt, callGemini, validateResponse } from "../services/geminiService.js";

const router = express.Router();

router.post("/advisory", async (req, res) => {
  try {
    const { farmerId, query } = req.body;

    // 1. Get Farmer Data
    const farmer = await Farmer.findById(farmerId);
    if (!farmer) {
      return res.status(404).json({ error: "Farmer not found" });
    }

    // 2. Fetch Real-Time Data (PARALLEL)
    const [soil, weather, market] = await Promise.all([
      getSoilData(farmer.location.lat, farmer.location.lon),
      getWeather(farmer.location.lat, farmer.location.lon),
      getMarketData(farmer.crop?.current || "Rice")
    ]);

    // 3. Community Alerts
    // NOTE: Requires a 2dsphere index on location to work accurately. Using a simple query for fallback
    let alerts = [];
    try {
      alerts = await Alert.find({
        location: {
          $near: {
            $geometry: {
               type: "Point" ,
               coordinates: [ farmer.location.lon , farmer.location.lat ]
            },
            $maxDistance: 50000 // 50km
          }
        }
      });
    } catch(e) {
      console.warn("Geospatial index might be missing, falling back to empty alerts", e.message);
      alerts = [];
    }

    // 4. Build AI Prompt
    const prompt = buildPrompt({
      farmer,
      soil,
      weather,
      market,
      alerts,
      query
    });

    // 5. Call Gemini
    const aiResponse = await callGemini(prompt);

    // 6. Anti-Hallucination validation 
    if (!validateResponse(aiResponse)) {
      return res.status(500).json({ error: "Invalid AI response generated", raw: aiResponse });
    }

    // 7. Return
    res.json(aiResponse);

  } catch (err) {
    console.error("Advisory Error", err);
    res.status(500).json({ error: err.message });
  }
});

export default router;
