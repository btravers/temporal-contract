import { ContractDefinition, ActivityDefinition } from "@temporal-contract/contract";
import type { NativeConnection, WorkerOptions } from "@temporalio/worker";

/**
 * Map of all activity implementations for a contract (global + all workflow-specific)
 *
 * Activities must return Future<Result<Output, ActivityError>>
 * The actual type safety is enforced by declareActivitiesHandler
 */
export type ContractActivitiesImplementation<TContract extends ContractDefinition> =
  // Global activities
  (TContract["activities"] extends Record<string, ActivityDefinition>
    ? {
        [K in keyof TContract["activities"]]: (args: unknown) => unknown;
      }
    : {}) &
    // All workflow-specific activities merged
    {
      [TWorkflow in keyof TContract["workflows"]]: TContract["workflows"][TWorkflow]["activities"] extends Record<
        string,
        ActivityDefinition
      >
        ? {
            [K in keyof TContract["workflows"][TWorkflow]["activities"]]: (
              args: unknown,
            ) => unknown;
          }
        : {};
    };

/**
 * Options for configuring the Temporal module
 */
export interface TemporalModuleOptions<
  TContract extends ContractDefinition = ContractDefinition,
> extends Omit<WorkerOptions, "activities" | "taskQueue" | "connection" | "workflowsPath"> {
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
   * Connection to Temporal server
   */
  connection: NativeConnection;

  /**
   * Path to workflows directory
   */
  workflowsPath: string;
}
