import { Worker } from "@temporalio/worker";
import { extname } from "node:path";
import { fileURLToPath } from "node:url";
import { activitiesHandler } from "./activities/index.js";
import { boxedOrderContract } from "./contract.js";
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
  // Create Temporal Worker
  const worker = await Worker.create({
    workflowsPath: workflowPath("workflows/process-order"),
    activities: activitiesHandler.activities,
    taskQueue: boxedOrderContract.taskQueue,
  });

  logger.info("🚀 Boxed Order Processing Worker started");

  await worker.run();
}

run().catch((err) => {
  logger.error({ err }, "Worker failed");
  process.exit(1);
});
