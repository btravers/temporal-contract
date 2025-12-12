export { TypedClient, type TypedWorkflowHandle, type TypedWorkflowStartOptions } from "./client.js";

// Re-export errors from client-boxed for convenience
export {
  TypedClientBoxedError as TypedClientError,
  WorkflowNotFoundError,
  WorkflowValidationError,
  QueryValidationError,
  SignalValidationError,
  UpdateValidationError,
} from "@temporal-contract/client-boxed";
