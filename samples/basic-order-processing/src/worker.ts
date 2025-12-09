import { NativeConnection, Worker } from "@temporalio/worker";
import { dirname, join } from "node:path";
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

// Get the directory path for ES modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

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
    workflowsPath: join(__dirname, "workflows"),

    // Register activities from the handler
    activities: activitiesHandler.activities,
  });

  logger.info("✅ Worker registered successfully");
  logger.info({ taskQueue: "order-processing" }, `📝 Task Queue: order-processing`);
  logger.info(
    { workflowsPath: join(__dirname, "workflows") },
    `📂 Workflows: ${join(__dirname, "workflows")}`,
  );
  logger.info(
    { activitiesCount: Object.keys(activitiesHandler.activities).length },
    `⚙️  Activities: ${Object.keys(activitiesHandler.activities).length} registered`,
  );
  logger.info("👂 Worker is now listening for tasks...");

  // Run the worker
  await worker.run();
}

run().catch((err) => {
  logger.error({ err }, "❌ Worker failed");
  process.exit(1);
});
