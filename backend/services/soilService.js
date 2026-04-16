import axios from "axios";

export const getSoilData = async (lat, lon) => {
  try {
    const url = `https://rest.isric.org/soilgrids/v2.0/properties/query?lon=${lon}&lat=${lat}&property=phh2o&property=wv0033&property=nitrogen&property=soc&property=cec&value=mean`;
    
    const res = await axios.get(url);
    const layers = res.data.properties.layers;

    const getValue = (name) => {
      const layer = layers.find(l => l.name === name);
      return layer?.depths?.[0]?.values?.mean || null;
    };

    return {
      ph: getValue("phh2o") ? getValue("phh2o") / 10 : null,  // convert
      moisture: getValue("wv0033"),
      nitrogen: getValue("nitrogen"),
      soc: getValue("soc"),
      cec: getValue("cec")
    };
  } catch (error) {
    console.error("Error fetching soil data", error);
    return null;
  }
};
