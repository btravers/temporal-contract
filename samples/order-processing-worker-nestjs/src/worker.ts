import { NestFactory } from "@nestjs/core";
import { NativeConnection, Worker } from "@temporalio/worker";
import { extname } from "node:path";
import { fileURLToPath } from "node:url";
import { AppModule } from "./app.module.js";
import { ACTIVITIES_HANDLER_TOKEN } from "@temporal-contract/worker-nestjs/activity";
import { logger } from "./logger.js";

function workflowPath(filename: string): string {
  return fileURLToPath(new URL(`./${filename}${extname(import.meta.url)}`, import.meta.url));
}

/**
 * Start the Temporal Worker with NestJS integration
 *
 * The worker:
 * - Creates a NestJS application context for dependency injection
 * - Gets the activities handler from the DI container
 * - Loads workflows from the workflows directory using workflowsPath
 * - Registers activities from the handler
 * - Listens on the 'order-processing' task queue
 */
async function run() {
  logger.info("🚀 Starting Order Processing Worker (NestJS)...");

  // Create NestJS application context
  logger.info("Creating NestJS application context...");
  const app = await NestFactory.createApplicationContext(AppModule, {
    logger: false, // Disable NestJS default logger
  });

  // Get activities handler from DI container
  const activitiesHandler = app.get(ACTIVITIES_HANDLER_TOKEN);
  logger.info(
    { activitiesCount: Object.keys(activitiesHandler.activities).length },
    "Activities handler initialized",
  );

  // Create connection to Temporal server
  const connection = await NativeConnection.connect({
    address: "localhost:7233",
  });

  // Create and run the worker
  const worker = await Worker.create({
    connection,
    namespace: "default",
    taskQueue: "order-processing",

    // Load workflows from the file system
    workflowsPath: workflowPath("workflows"),

    // Register activities from the handler
    activities: activitiesHandler.activities,
  });

  logger.info("✅ Worker registered successfully");

  // Run the worker
  await worker.run();
}

run().catch((err) => {
  logger.error({ err }, "❌ Worker failed");
  process.exit(1);
});
