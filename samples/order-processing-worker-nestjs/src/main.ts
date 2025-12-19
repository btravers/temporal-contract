import "reflect-metadata";
import { NestFactory } from "@nestjs/core";
import { AppModule } from "./app.module.js";
import { TemporalService } from "@temporal-contract/worker-nestjs";

/**
 * Bootstrap the NestJS application and start the Temporal worker
 */
async function bootstrap() {
  console.log("🚀 Starting Order Processing Worker (NestJS)...");

  // Create NestJS application context
  const app = await NestFactory.createApplicationContext(AppModule, {
    logger: ["log", "error", "warn"],
  });

  console.log("✅ NestJS application context created");

  // Get the TemporalService from the DI container
  const temporalService = app.get(TemporalService);

  console.log("✅ Temporal worker registered successfully");
  console.log("📦 Task Queue: order-processing");
  console.log("🔄 Starting worker...");

  // Start the worker (this will block until shutdown)
  await temporalService.start();
}

bootstrap().catch((error) => {
  console.error("❌ Worker failed to start:", error);
  process.exit(1);
});
