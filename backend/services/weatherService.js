import axios from "axios";

export const getWeather = async (lat, lon) => {
  try {
    const apiKey = process.env.OPENWEATHER_API_KEY;
    if (!apiKey) throw new Error("Missing OPENWEATHER_API_KEY");
    
    const res = await axios.get(
      `https://api.openweathermap.org/data/2.5/weather?lat=${lat}&lon=${lon}&appid=${apiKey}`
    );

    return res.data;
  } catch (error) {
    console.error("Error fetching weather data", error.message);
    return null;
  }
};
