import { app } from "./app.js";
import { config } from "./config/env.js";
import { connectToDatabase } from "./db/mongoose.js";

async function bootstrap() {
  await connectToDatabase();

  app.listen(config.port, () => {
    console.log(`Fraud detection API running on port ${config.port}`);
  });
}

bootstrap();
