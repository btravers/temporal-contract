// Entry point for activities
export { declareActivitiesHandler } from "./handler.js";
export type {
  BoxedActivityImplementation,
  ActivityImplementations,
  DeclareActivitiesHandlerOptions,
  ActivitiesHandler,
} from "./handler.js";
export {
  WorkerError,
  ActivityError,
  ActivityDefinitionNotFoundError,
  ActivityInputValidationError,
  ActivityOutputValidationError,
} from "./errors.js";

// Re-export boxed utilities for convenience in activities
export { Result, Future, Option, AsyncData } from "@swan-io/boxed";
