// Entry point for worker creation utilities
import { ContractDefinition } from "@temporal-contract/contract";
import { Worker, WorkerOptions } from "@temporalio/worker";
import { fileURLToPath } from "node:url";
import { extname } from "node:path";
import type { ActivitiesHandler } from "./activity.js";

/**
 * Options for creating a Temporal worker
 */
export interface CreateWorkerOptions<TContract extends ContractDefinition> extends Omit<
  WorkerOptions,
  "activities" | "taskQueue"
> {
  /**
   * The contract definition for this worker
   */
  contract: TContract;

  /**
   * Activities handler for this worker
   */
  activities: ActivitiesHandler<TContract>;
}

/**
 * Create a typed Temporal worker with contract-based configuration
 *
 * This helper simplifies worker creation by:
 * - Using the contract's task queue automatically
 * - Providing type-safe configuration
 *
 * @example
 * ```ts
 * import { NativeConnection } from '@temporalio/worker';
 * import { createWorker } from '@temporal-contract/worker/worker';
 * import { activities } from './activities';
 * import myContract from './contract';
 *
 * const connection = await NativeConnection.connect({
 *   address: 'localhost:7233',
 * });
 *
 * const worker = await createWorker({
 *   contract: myContract,
 *   connection,
 *   workflowsPath: require.resolve('./workflows'),
 *   activities,
 * });
 *
 * await worker.run();
 * ```
 */
export async function createWorker<TContract extends ContractDefinition>(
  options: CreateWorkerOptions<TContract>,
): Promise<Worker> {
  const { contract, activities, ...workerOptions } = options;

  // Create the worker with contract's task queue
  const worker = await Worker.create({
    ...workerOptions,
    activities,
    taskQueue: contract.taskQueue,
  });

  return worker;
}

/**
 * Helper to create a workflowsPath from a file URL
 *
 * Useful for creating the workflowsPath option when using ES modules
 *
 * @example
 * ```ts
 * import { workflowsPathFromURL } from '@temporal-contract/worker/worker';
 *
 * const worker = await createWorker({
 *   contract: myContract,
 *   connection,
 *   workflowsPath: workflowsPathFromURL(import.meta.url, './workflows'),
 *   activities,
 * });
 * ```
 */
export function workflowsPathFromURL(baseURL: string, relativePath: string): string {
  return fileURLToPath(new URL(`${relativePath}${extname(baseURL)}`, baseURL));
}
