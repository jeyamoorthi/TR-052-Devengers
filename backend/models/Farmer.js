import mongoose from "mongoose";

const FarmerSchema = new mongoose.Schema({
  name: String,
  location: {
    lat: Number,
    lon: Number,
    region: String
  },
  farmSize: Number,
  soil: {
    ph: Number,
    moisture: Number,
    nitrogen: Number,
    soc: Number,
    cec: Number
  },
  crop: {
    current: String,
    stage: String,
    history: [String]
  },
  diseaseHistory: [String],
  investment: Number,
  losses: Number,
  fpoMember: Boolean,
  language: String,
  createdAt: { type: Date, default: Date.now }
});

export const Farmer = mongoose.model("Farmer", FarmerSchema);
