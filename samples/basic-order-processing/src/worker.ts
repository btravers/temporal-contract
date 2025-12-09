import { NativeConnection, Worker } from "@temporalio/worker";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { activitiesHandler } from "./activities/index.js";

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
  console.log("🚀 Starting Order Processing Worker...\n");

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

  console.log("✅ Worker registered successfully");
  console.log(`📝 Task Queue: order-processing`);
  console.log(`📂 Workflows: ${join(__dirname, "workflows")}`);
  console.log(`⚙️  Activities: ${Object.keys(activitiesHandler.activities).length} registered\n`);
  console.log("👂 Worker is now listening for tasks...\n");

  // Run the worker
  await worker.run();
}

run().catch((err) => {
  console.error("❌ Worker failed:", err);
  process.exit(1);
});
