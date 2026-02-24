import { Data } from "effect";
import type { ParseError } from "effect/ParseResult";

/**
 * Error raised when a workflow name is not found in the contract definition
 */
export class WorkflowNotFoundError extends Data.TaggedError("WorkflowNotFoundError")<{
  readonly workflowName: string;
  readonly availableWorkflows: readonly string[];
}> {}

/**
 * Error raised when workflow input or output fails schema validation
 */
export class WorkflowValidationError extends Data.TaggedError("WorkflowValidationError")<{
  readonly workflowName: string;
  readonly direction: "input" | "output";
  readonly parseError: ParseError;
}> {}

/**
 * Error raised when query input or output fails schema validation
 */
export class QueryValidationError extends Data.TaggedError("QueryValidationError")<{
  readonly queryName: string;
  readonly direction: "input" | "output";
  readonly parseError: ParseError;
}> {}

/**
 * Error raised when signal input fails schema validation
 */
export class SignalValidationError extends Data.TaggedError("SignalValidationError")<{
  readonly signalName: string;
  readonly parseError: ParseError;
}> {}

/**
 * Error raised when update input or output fails schema validation
 */
export class UpdateValidationError extends Data.TaggedError("UpdateValidationError")<{
  readonly updateName: string;
  readonly direction: "input" | "output";
  readonly parseError: ParseError;
}> {}

/**
 * Error raised when a Temporal SDK operation fails at runtime
 */
export class RuntimeClientError extends Data.TaggedError("RuntimeClientError")<{
  readonly operation: string;
  readonly cause: unknown;
}> {}
