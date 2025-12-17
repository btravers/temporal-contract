// Entry point for workflow decorators and modules
export { ImplementWorkflow } from "./workflow-decorators.js";
export type { WorkflowImplementationMetadata } from "./workflow-decorators.js";
export {
  extractWorkflowsFromProvider,
  getWorkflowContractFromProvider,
} from "./workflow-decorators.js";

export { createWorkflowsModule, WORKFLOW_IMPLEMENTATIONS_TOKEN } from "./workflow-module.js";
export type { WorkflowsModuleOptions } from "./workflow-module.js";

// Re-export types from worker package for convenience
export type {
  WorkflowImplementation,
  WorkflowContext,
  DeclareWorkflowOptions,
} from "@temporal-contract/worker/workflow";
