import { app } from "../src/app.js";
import { connectToDatabase } from "../src/db/mongoose.js";

let dbInitPromise;

async function ensureDatabase() {
  if (!dbInitPromise) {
    dbInitPromise = connectToDatabase();
  }

  await dbInitPromise;
}

export default async function handler(req, res) {
  await ensureDatabase();
  return app(req, res);
}
