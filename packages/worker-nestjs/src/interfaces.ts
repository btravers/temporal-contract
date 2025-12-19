import type { ContractDefinition } from "@temporal-contract/contract";
import type { NativeConnection, WorkerOptions } from "@temporalio/worker";

// Re-export the type from worker package for proper type safety
export type { ActivitiesHandler } from "@temporal-contract/worker/activity";

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
   *
   * Use declareActivitiesHandler from @temporal-contract/worker to create type-safe activities
   */
  activities: Record<string, (args: unknown) => unknown>;

  /**
   * Connection to Temporal server
   */
  connection: NativeConnection;

  /**
   * Path to workflows directory
   */
  workflowsPath: string;
}
