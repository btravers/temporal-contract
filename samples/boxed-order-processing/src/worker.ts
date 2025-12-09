import { Worker } from "@temporalio/worker";
import { createBoxedActivitiesHandler } from "@temporal-contract/worker-boxed";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { activities } from "./activities/index.js";
import { boxedOrderContract } from "./contract.js";

const __dirname = dirname(fileURLToPath(import.meta.url));

/**
 * Boxed Order Processing Worker
 *
 * This worker demonstrates the Result/Future pattern for explicit error handling.
 * Activities return Result<T, ActivityError> instead of throwing exceptions.
 *
 * Key features:
 * - Explicit error types in activity signatures
 * - Better testability (no try/catch in activity code)
 * - Functional composition with map/flatMap/match
 * - Automatic unwrapping to Temporal exceptions
 */

async function run() {
  // Create activities handler with Result pattern
  const activitiesHandler = createBoxedActivitiesHandler({
    contract: boxedOrderContract,
    activities,
  });

  // Create Temporal Worker
  const worker = await Worker.create({
    workflowsPath: resolve(__dirname, "workflows"),
    activities: activitiesHandler.activities,
    taskQueue: boxedOrderContract.taskQueue,
  });

  console.log("🚀 Boxed Order Processing Worker started");
  console.log(`   Task Queue: ${boxedOrderContract.taskQueue}`);
  console.log(`   Workflows Path: ${resolve(__dirname, "workflows")}`);
  console.log(`   Pattern: Result/Future for explicit error handling`);
  console.log("\nWorker is running... Press Ctrl+C to stop.\n");

  await worker.run();
}

run().catch((err) => {
  console.error("Worker failed:", err);
  process.exit(1);
});
