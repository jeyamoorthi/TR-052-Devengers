import mongoose from "mongoose";

const AlertSchema = new mongoose.Schema({
  location: {
    lat: Number,
    lon: Number
  },
  crop: String,
  disease: String,
  severity: String,
  createdAt: { type: Date, default: Date.now }
});
// Add geospatial index if needed, for simplicity using regular query here, but $near requires 2dsphere index in a real setup.
AlertSchema.index({ "location": "2dsphere" });

export const Alert = mongoose.model("Alert", AlertSchema);
