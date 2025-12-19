import "reflect-metadata";
import { NestFactory } from "@nestjs/core";
import { AppModule } from "./app.module.js";
import { logger } from "./logger.js";

/**
 * Bootstrap the NestJS application with Temporal worker
 *
 * The Temporal worker:
 * - Starts automatically when the NestJS application context is created
 * - Uses dependency injection for all activities
 * - Handles graceful shutdown on SIGTERM/SIGINT signals
 */
async function bootstrap() {
  logger.info("🚀 Starting Order Processing Worker (NestJS)...");

  try {
    // Create NestJS application context (no HTTP server needed for worker)
    const app = await NestFactory.createApplicationContext(AppModule, {
      logger: false, // Use pino logger instead of NestJS logger
    });

    logger.info("✅ Worker registered successfully");

    // Handle graceful shutdown
    const shutdown = async (signal: string) => {
      logger.info(`Received ${signal}, shutting down gracefully...`);
      await app.close();
      logger.info("✅ Worker shut down successfully");
      process.exit(0);
    };

    process.on("SIGTERM", () => shutdown("SIGTERM"));
    process.on("SIGINT", () => shutdown("SIGINT"));

    // Keep the process running
    await new Promise(() => {});
  } catch (err) {
    logger.error({ err }, "❌ Worker failed");
    process.exit(1);
  }
}

bootstrap();
