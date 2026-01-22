import { NativeConnection } from "@temporalio/worker";
import { createWorker } from "@temporal-contract/worker/worker";
import { orderProcessingContract } from "@temporal-contract/sample-order-processing-contract";
import { extname } from "node:path";
import { fileURLToPath } from "node:url";
import { activities } from "./activities.js";
import { logger } from "../logger.js";

function workflowPath(filename: string): string {
  return fileURLToPath(new URL(`./${filename}${extname(import.meta.url)}`, import.meta.url));
}

/**
 * Start the Temporal Worker
 *
 * The worker:
 * - Loads workflows from the workflows directory using workflowsPath
 * - Registers activities from the activities handler
 * - Listens on the 'order-processing' task queue (from contract)
 */
async function run() {
  logger.info("🚀 Starting Order Processing Worker...");

  // Create connection to Temporal server
  const connection = await NativeConnection.connect({
    address: "localhost:7233",
  });

  // Create and run the worker using createWorker
  const worker = await createWorker({
    contract: orderProcessingContract,
    connection,
    namespace: "default",
    workflowsPath: workflowPath("workflows"),
    activities,
  });

  logger.info("✅ Worker registered successfully");

  // Run the worker
  await worker.run();
}

run().catch((err) => {
  logger.error({ err }, "❌ Worker failed");
  process.exit(1);
});
