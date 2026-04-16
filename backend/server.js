import express from "express";
import mongoose from "mongoose";
import cors from "cors";
import dotenv from "dotenv";
import apiRoutes from "./routes/api.js";

dotenv.config();

const app = express();
app.use(cors());
app.use(express.json());

// DB Connection
const mongoURI = process.env.MONGO_URI || "mongodb://admin:securepassword123@localhost:27017/smartagri?authSource=smartagri";

mongoose.connect(mongoURI)
.then(() => console.log("MongoDB Connected"))
.catch(err => console.log("MongoDB connection error:", err));

// Routes
app.use("/api", apiRoutes);

app.get("/", (req, res) => {
  res.send("SmartAgri Node.js Backend is running!");
});

const port = process.env.PORT || 8000;
app.listen(port, () => {
    console.log(`Backend server running on port: ${port}`);
});
