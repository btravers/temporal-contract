import type { z } from "zod";

/**
 * Base error class for typed client errors
 */
export class TypedClientError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "TypedClientError";
    // Maintains proper stack trace for where our error was thrown (only available on V8)
    if (Error.captureStackTrace) {
      Error.captureStackTrace(this, this.constructor);
    }
  }
}

/**
 * Error thrown when a workflow is not found in the contract
 */
export class WorkflowNotFoundError extends TypedClientError {
  constructor(
    public readonly workflowName: string,
    public readonly availableWorkflows: readonly string[] = [],
  ) {
    const message =
      availableWorkflows.length > 0
        ? `Workflow "${workflowName}" not found in contract. Available workflows: ${availableWorkflows.join(", ")}`
        : `Workflow "${workflowName}" not found in contract`;
    super(message);
    this.name = "WorkflowNotFoundError";
  }
}

/**
 * Error thrown when workflow input or output validation fails
 */
export class WorkflowValidationError extends TypedClientError {
  constructor(
    public readonly workflowName: string,
    public readonly phase: "input" | "output",
    public readonly zodError: z.ZodError,
  ) {
    super(`Validation failed for workflow "${workflowName}" ${phase}: ${zodError.message}`);
    this.name = "WorkflowValidationError";
  }
}

/**
 * Error thrown when query input or output validation fails
 */
export class QueryValidationError extends TypedClientError {
  constructor(
    public readonly queryName: string,
    public readonly phase: "input" | "output",
    public readonly zodError: z.ZodError,
  ) {
    super(`Validation failed for query "${queryName}" ${phase}: ${zodError.message}`);
    this.name = "QueryValidationError";
  }
}

/**
 * Error thrown when signal input validation fails
 */
export class SignalValidationError extends TypedClientError {
  constructor(
    public readonly signalName: string,
    public readonly zodError: z.ZodError,
  ) {
    super(`Validation failed for signal "${signalName}" input: ${zodError.message}`);
    this.name = "SignalValidationError";
  }
}

/**
 * Error thrown when update input or output validation fails
 */
export class UpdateValidationError extends TypedClientError {
  constructor(
    public readonly updateName: string,
    public readonly phase: "input" | "output",
    public readonly zodError: z.ZodError,
  ) {
    super(`Validation failed for update "${updateName}" ${phase}: ${zodError.message}`);
    this.name = "UpdateValidationError";
  }
}
