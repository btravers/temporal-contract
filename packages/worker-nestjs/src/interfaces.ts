import { ContractDefinition, ActivityDefinition } from "@temporal-contract/contract";
import type { NativeConnection, WorkerOptions } from "@temporalio/worker";
import type { Future, Result } from "@temporal-contract/boxed";
import type { ActivityError } from "@temporal-contract/worker/activity";
import type { StandardSchemaV1 } from "@standard-schema/spec";

/**
 * Infer input type from an activity definition (worker perspective)
 */
type WorkerInferInput<T extends { input: { "~standard": StandardSchemaV1 } }> = StandardSchemaV1.InferOutput<
  T["input"]["~standard"]
>;

/**
 * Infer output type from an activity definition (worker perspective)
 */
type WorkerInferOutput<T extends { output: { "~standard": StandardSchemaV1 } }> = StandardSchemaV1.InferInput<
  T["output"]["~standard"]
>;

/**
 * Activity implementation using Future/Result pattern
 */
type BoxedActivityImplementation<TActivity extends ActivityDefinition> = (
  args: WorkerInferInput<TActivity>,
) => Future<Result<WorkerInferOutput<TActivity>, ActivityError>>;

/**
 * Map of all activity implementations for a contract (global + all workflow-specific)
 */
export type ContractActivitiesImplementation<TContract extends ContractDefinition> =
  // Global activities
  (TContract["activities"] extends Record<string, ActivityDefinition>
    ? {
        [K in keyof TContract["activities"]]: BoxedActivityImplementation<TContract["activities"][K]>;
      }
    : {}) &
    // All workflow-specific activities merged
    {
      [TWorkflow in keyof TContract["workflows"]]: TContract["workflows"][TWorkflow]["activities"] extends Record<
        string,
        ActivityDefinition
      >
        ? {
            [K in keyof TContract["workflows"][TWorkflow]["activities"]]: BoxedActivityImplementation<
              TContract["workflows"][TWorkflow]["activities"][K]
            >;
          }
        : {};
    };

/**
 * Options for configuring the Temporal module
 */
export interface TemporalModuleOptions<TContract extends ContractDefinition = ContractDefinition> {
  /**
   * The contract definition for this worker
   */
  contract: TContract;

  /**
   * Activities implementation for the contract
   * All activities (global + workflow-specific) must be implemented
   */
  activities: ContractActivitiesImplementation<TContract>;

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
