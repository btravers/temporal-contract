import type { StandardSchemaV1 } from "@standard-schema/spec";

/**
 * Base class for all typed client errors with boxed pattern
 */
export class TypedClientBoxedError extends Error {
  constructor(message: string) {
    super(message);
    this.name = this.constructor.name;
    if (Error.captureStackTrace) {
      Error.captureStackTrace(this, this.constructor);
    }
  }
}

/**
 * Thrown when a workflow is not found in the contract
 */
export class WorkflowNotFoundError extends TypedClientBoxedError {
  constructor(
    public readonly workflowName: string,
    public readonly availableWorkflows: string[],
  ) {
    super(
      `Workflow "${workflowName}" not found in contract. Available workflows: ${availableWorkflows.join(", ")}`,
    );
  }
}

/**
 * Thrown when workflow input or output validation fails
 */
export class WorkflowValidationError extends TypedClientBoxedError {
  constructor(
    public readonly workflowName: string,
    public readonly direction: "input" | "output",
    public readonly issues: StandardSchemaV1.IssueResult["issues"],
  ) {
    super(
      `Validation failed for workflow "${workflowName}" ${direction}: ${JSON.stringify(issues)}`,
    );
  }
}

/**
 * Thrown when query input or output validation fails
 */
export class QueryValidationError extends TypedClientBoxedError {
  constructor(
    public readonly queryName: string,
    public readonly direction: "input" | "output",
    public readonly issues: StandardSchemaV1.IssueResult["issues"],
  ) {
    super(`Validation failed for query "${queryName}" ${direction}: ${JSON.stringify(issues)}`);
  }
}

/**
 * Thrown when signal input validation fails
 */
export class SignalValidationError extends TypedClientBoxedError {
  constructor(
    public readonly signalName: string,
    public readonly issues: StandardSchemaV1.IssueResult["issues"],
  ) {
    super(`Validation failed for signal "${signalName}": ${JSON.stringify(issues)}`);
  }
}

/**
 * Thrown when update input or output validation fails
 */
export class UpdateValidationError extends TypedClientBoxedError {
  constructor(
    public readonly updateName: string,
    public readonly direction: "input" | "output",
    public readonly issues: StandardSchemaV1.IssueResult["issues"],
  ) {
    super(`Validation failed for update "${updateName}" ${direction}: ${JSON.stringify(issues)}`);
  }
}
