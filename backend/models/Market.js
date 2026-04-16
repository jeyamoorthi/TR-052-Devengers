import mongoose from "mongoose";

const MarketSchema = new mongoose.Schema({
  crop: String,
  price: Number,
  trend: String,
  location: String,
  updatedAt: Date
});

export const Market = mongoose.model("Market", MarketSchema);
