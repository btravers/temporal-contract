/**
 * Re-export workflow utilities from @temporal-contract/worker/workflow
 *
 * Workflows cannot use NestJS dependency injection due to Temporal's workflow isolation.
 * This module simply re-exports the workflow utilities for convenience.
 */

// Re-export declareWorkflow and types from worker package
export { declareWorkflow } from "@temporal-contract/worker/workflow";

export type {
  WorkflowImplementation,
  WorkflowContext,
  DeclareWorkflowOptions,
} from "@temporal-contract/worker/workflow";
