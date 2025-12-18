// Entry point for worker creation utilities
import { ContractDefinition } from "@temporal-contract/contract";
import {
  NativeConnection,
  NativeConnectionOptions,
  Worker,
  WorkerOptions,
} from "@temporalio/worker";
import { fileURLToPath } from "node:url";
import { extname } from "node:path";

/**
 * Options for creating a Temporal worker
 */
export interface CreateWorkerOptions<TContract extends ContractDefinition> extends Omit<
  WorkerOptions,
  "connection" | "taskQueue"
> {
  /**
   * The contract definition for this worker
   */
  contract: TContract;

  /**
   * Optional connection to Temporal server
   * If not provided, a new connection will be created using the provided connectionOptions
   */
  connection?: NativeConnection;

  /**
   * Options for creating a connection to Temporal server
   * Only used if connection is not provided
   */
  connectionOptions?: NativeConnectionOptions;
}

/**
 * Create a typed Temporal worker with contract-based configuration
 *
 * This helper simplifies worker creation by:
 * - Using the contract's task queue automatically
 * - Managing connection lifecycle
 * - Providing type-safe configuration
 *
 * @example
 * ```ts
 * import { createWorker } from '@temporal-contract/worker/worker';
 * import { activities } from './activities';
 * import myContract from './contract';
 *
 * const worker = await createWorker({
 *   contract: myContract,
 *   workflowsPath: require.resolve('./workflows'),
 *   activities,
 *   connectionOptions: {
 *     address: 'localhost:7233',
 *   },
 * });
 *
 * await worker.run();
 * ```
 *
 * @example With existing connection
 * ```ts
 * import { NativeConnection } from '@temporalio/worker';
 * import { createWorker } from '@temporal-contract/worker/worker';
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
  const { contract, connection, connectionOptions, ...workerOptions } = options;

  // Use provided connection or create a new one
  const workerConnection =
    connection ||
    (await NativeConnection.connect(connectionOptions || { address: "localhost:7233" }));

  // Create the worker with contract's task queue
  const worker = await Worker.create({
    ...workerOptions,
    connection: workerConnection,
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
 * import { fileURLToPath } from 'node:url';
 * import { workflowsPathFromURL } from '@temporal-contract/worker/worker';
 *
 * const worker = await createWorker({
 *   contract: myContract,
 *   workflowsPath: workflowsPathFromURL(import.meta.url, './workflows'),
 *   activities,
 * });
 * ```
 */
export function workflowsPathFromURL(baseURL: string, relativePath: string): string {
  return fileURLToPath(new URL(`${relativePath}${extname(baseURL)}`, baseURL));
}
