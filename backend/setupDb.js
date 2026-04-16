import mongoose from "mongoose";
import { Farmer } from "./models/Farmer.js";
import dotenv from "dotenv";

dotenv.config();

const mongoURI = "mongodb://localhost:27017/";
const dbName = "smartagri";

async function setup() {
  try {
    console.log("Attempting to connect without auth to create user...");
    // Try to connect without auth first
    const conn = await mongoose.connect(mongoURI + dbName);
    const db = mongoose.connection.db;

    try {
      await db.command({
        createUser: "admin",
        pwd: "securepassword123",
        roles: [{ role: "readWrite", db: "smartagri" }]
      });
      console.log("User 'admin' created successfully.");
    } catch (err) {
       console.log("Create user step output (might already exist or auth required):", err.message);
    }
    await mongoose.disconnect();
  } catch(e) {
    console.log("No-auth connection failed, moving on to auth connection", e.message);
  }

  try {
    console.log("Attempting to connect with Auth to seed database...");
    await mongoose.connect(`mongodb://admin:securepassword123@localhost:27017/${dbName}?authSource=smartagri`);
    
    console.log("Connected successfully. Creating perfect standard user...");
    await Farmer.deleteMany({});
    
    const perfectUser = new Farmer({
      name: "Ravi Kumar",
      location: {
        lat: 10.7905,
        lon: 79.1378,
        region: "Thanjavur, Tamil Nadu"
      },
      farmSize: 5.5,
      soil: {
        ph: 6.2,
        moisture: 45,
        nitrogen: 18, 
        soc: 1.2, 
        cec: 15
      },
      crop: {
        current: "Rice",
        stage: "Vegetative",
        history: ["Wheat", "Maize"]
      },
      diseaseHistory: ["Fungal Blight", "Stem Borer"],
      investment: 45000,
      losses: 8000,
      fpoMember: true,
      language: "en"
    });

    const saved = await perfectUser.save();
    console.log("Created Standard Farmer successfully! ID:", saved._id.toString());
    
    process.exit(0);
  } catch (error) {
    console.error("Setup with auth failed:", error.message);
    process.exit(1);
  }
}

setup();
