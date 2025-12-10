import { NativeConnection, Worker } from "@temporalio/worker";
import { extname } from "node:path";
import { fileURLToPath } from "node:url";
import { activitiesHandler } from "./activities/index.js";
import pino from "pino";

const logger = pino({
  transport: {
    target: "pino-pretty",
    options: {
      colorize: true,
      translateTime: "SYS:standard",
      ignore: "pid,hostname",
    },
  },
});

function workflowPath(filename: string): string {
  return fileURLToPath(new URL(`./${filename}${extname(import.meta.url)}`, import.meta.url));
}

/**
 * Start the Temporal Worker
 *
 * The worker:
 * - Loads workflows from the workflows directory using workflowsPath
 * - Registers activities from the activities handler
 * - Listens on the 'order-processing' task queue
 */
async function run() {
  logger.info("🚀 Starting Order Processing Worker...");

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
    workflowsPath: workflowPath("workflows/process-order"),

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
