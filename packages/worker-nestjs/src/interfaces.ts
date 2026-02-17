import type { ContractDefinition } from "@temporal-contract/contract";
import { ActivitiesHandler } from "@temporal-contract/worker/activity";
import type { NativeConnection, WorkerOptions } from "@temporalio/worker";

// Re-export the type from worker package for proper type safety
export type { ActivitiesHandler } from "@temporal-contract/worker/activity";

/**
 * Options for configuring the Temporal module
 */
export type TemporalModuleOptions<TContract extends ContractDefinition = ContractDefinition> = Omit<
  WorkerOptions,
  "activities" | "taskQueue" | "connection" | "workflowsPath"
> & {
  /**
   * The contract definition for this worker
   */
  contract: TContract;

  /**
   * Activities implementation for the contract
   * All activities (global + workflow-specific) must be implemented
   *
   * Use declareActivitiesHandler from @temporal-contract/worker to create type-safe activities
   */
  activities: ActivitiesHandler<TContract>;

  /**
   * Connection to Temporal server
   */
  connection: NativeConnection;

  /**
   * Path to workflows directory
   */
  workflowsPath: string;
};
