// Entry point for activities (can use @swan-io/boxed)
export {
  declareActivitiesHandler,
  ActivityError,
  type BoxedActivityImplementation,
  type BoxedActivityImplementations,
  type BoxedActivityHandler,
  type BoxedWorkflowActivityHandler,
  type DeclareActivitiesHandlerOptions,
  type ActivitiesHandler,
} from "./handler.js";

export {
  WorkerBoxedError,
  ActivityDefinitionNotFoundError,
  ActivityInputValidationError,
  ActivityOutputValidationError,
} from "./errors.js";

// Re-export boxed utilities for convenience in activities
export { Result, Future, Option, AsyncData } from "@swan-io/boxed";
