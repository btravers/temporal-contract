// Entry point for workflows (NO @swan-io/boxed to avoid non-deterministic code)
export {
  type WorkflowImplementation,
  type WorkflowContext,
  type DeclareWorkflowOptions,
} from "./handler.js";

// Re-export declareWorkflow directly from worker/workflow to avoid tree-shaking issues
export { declareWorkflow } from "@temporal-contract/worker/workflow";
