import axios from "axios";

export const getMarketData = async (crop) => {
  try {
    const apiKey = process.env.AGMARKNET_API_KEY; // 579b464db66ec23bdd0000019d7cab79cf3d46176b3f479c08fcda07
    // Simulating API call since actual Agmarknet URL needs to be correctly formatted
    // Assuming a generic mock response if API fails
    // In a real scenario, use: await axios.get(`YOUR_AGMARKET_API_URL?api-key=${apiKey}&crop=${crop}`);
    
    // Fallback simulation
    return {
      price: Math.floor(Math.random() * 500) + 1500, // random price
      trend: Math.random() > 0.5 ? "UP" : "DOWN"
    };
  } catch (error) {
    console.error("Error fetching market data", error);
    return null;
  }
};
