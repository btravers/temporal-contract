import { ContractDefinition } from "@temporal-contract/contract";
import type { NativeConnection, WorkerOptions } from "@temporalio/worker";

/**
 * Options for configuring the Temporal module
 */
export interface TemporalModuleOptions<TContract extends ContractDefinition = ContractDefinition> {
  /**
   * The contract definition for this worker
   */
  contract: TContract;

  /**
   * Connection to Temporal server (can be a NativeConnection instance or connection options)
   */
  connection:
    | NativeConnection
    | {
        address: string;
        [key: string]: unknown;
      };

  /**
   * Path to workflows directory
   */
  workflowsPath: string;

  /**
   * Additional worker options (excluding activities and taskQueue which are managed by the module)
   */
  workerOptions?: Omit<WorkerOptions, "activities" | "taskQueue" | "connection" | "workflowsPath">;
}

/**
 * Factory for creating module options
 */
export interface TemporalModuleOptionsFactory<
  TContract extends ContractDefinition = ContractDefinition,
> {
  createTemporalModuleOptions():
    | Promise<TemporalModuleOptions<TContract>>
    | TemporalModuleOptions<TContract>;
}

/**
 * Async options for the Temporal module
 */
export interface TemporalModuleAsyncOptions<
  TContract extends ContractDefinition = ContractDefinition,
> {
  imports?: unknown[];
  useFactory?: (
    ...args: unknown[]
  ) => Promise<TemporalModuleOptions<TContract>> | TemporalModuleOptions<TContract>;
  inject?: unknown[];
  useClass?: new (...args: unknown[]) => TemporalModuleOptionsFactory<TContract>;
  useExisting?: new (...args: unknown[]) => TemporalModuleOptionsFactory<TContract>;
}

/**
 * Metadata stored for each activity handler
 */
export interface ActivityHandlerMetadata {
  workflowName: string;
  activityName: string;
}
