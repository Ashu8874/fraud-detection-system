import mongoose from "mongoose";
import { config } from "../config/env.js";
import { setDatabaseConnected } from "./state.js";

export async function connectToDatabase() {
  try {
    await mongoose.connect(config.mongoUri);
    setDatabaseConnected(true);
    console.log("MongoDB connected");
  } catch (error) {
    setDatabaseConnected(false);
    console.warn("MongoDB unavailable. Running in memory-only mode:", error.message);
  }
}
