export {
  declareActivitiesHandler,
  declareWorkflow,
  type BoxedActivityImplementation,
  type BoxedActivityImplementations,
  type WorkflowImplementation,
  type WorkflowContext,
  type DeclareActivitiesHandlerOptions,
  type ActivitiesHandler,
  type DeclareWorkflowOptions,
  type ActivityError,
} from "./handler.js";

// Re-export boxed utilities for convenience
export { Result, Future, Option, AsyncData } from "@swan-io/boxed";
