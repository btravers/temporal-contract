import type { StandardSchemaV1 } from "@standard-schema/spec";

/**
 * Base class for all typed client errors with boxed pattern
 */
abstract class TypedClientError extends Error {
  protected constructor(message: string) {
    super(message);
    this.name = this.constructor.name;
    if (Error.captureStackTrace) {
      Error.captureStackTrace(this, this.constructor);
    }
  }
}

/**
 * Generic runtime failure wrapper when no specific error type applies
 */
export class RuntimeClientError extends TypedClientError {
  constructor(
    public readonly operation: string,
    public override readonly cause?: unknown,
  ) {
    super(
      `Operation "${operation}" failed: ${
        cause instanceof Error ? cause.message : String(cause ?? "unknown error")
      }`,
    );
  }
}

/**
 * Thrown when a workflow is not found in the contract
 */
export class WorkflowNotFoundError extends TypedClientError {
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
 * Render a Standard Schema {@link StandardSchemaV1.Issue} into a human-readable
 * string that includes the failing field's path.
 *
 * Example output:
 * - `at items[0].quantity: Expected number, received undefined`
 * - `at customerId: Expected string, received undefined`
 * - `Validation error` *(no path)*
 *
 * Path segments come either as bare `PropertyKey` values or as
 * `{ key: PropertyKey }` objects (per the spec); both are normalized.
 * Numeric segments render as bracketed indices; string segments use dot
 * notation (with a leading dot when not the first segment); symbols and
 * other property keys fall back to `String(key)`.
 */
function formatIssue(issue: StandardSchemaV1.Issue): string {
  if (issue.path === undefined || issue.path.length === 0) {
    return issue.message;
  }
  let path = "";
  for (let i = 0; i < issue.path.length; i++) {
    const segment = issue.path[i];
    const key =
      segment !== null && typeof segment === "object" && "key" in segment ? segment.key : segment;
    if (typeof key === "number") {
      path += `[${key}]`;
    } else if (typeof key === "string") {
      path += i === 0 ? key : `.${key}`;
    } else {
      // Symbol or other PropertyKey — bracket-stringify so it parses
      // unambiguously alongside string segments.
      path += `[${String(key)}]`;
    }
  }
  return `at ${path}: ${issue.message}`;
}

function summarizeIssues(issues: ReadonlyArray<StandardSchemaV1.Issue>): string {
  return issues.map(formatIssue).join("; ");
}

/**
 * Thrown when workflow input or output validation fails
 */
export class WorkflowValidationError extends TypedClientError {
  constructor(
    public readonly workflowName: string,
    public readonly direction: "input" | "output",
    public readonly issues: ReadonlyArray<StandardSchemaV1.Issue>,
  ) {
    super(
      `Validation failed for workflow "${workflowName}" ${direction}: ${summarizeIssues(issues)}`,
    );
  }
}

/**
 * Thrown when query input or output validation fails
 */
export class QueryValidationError extends TypedClientError {
  constructor(
    public readonly queryName: string,
    public readonly direction: "input" | "output",
    public readonly issues: ReadonlyArray<StandardSchemaV1.Issue>,
  ) {
    super(`Validation failed for query "${queryName}" ${direction}: ${summarizeIssues(issues)}`);
  }
}

/**
 * Thrown when signal input validation fails
 */
export class SignalValidationError extends TypedClientError {
  constructor(
    public readonly signalName: string,
    public readonly issues: ReadonlyArray<StandardSchemaV1.Issue>,
  ) {
    super(`Validation failed for signal "${signalName}": ${summarizeIssues(issues)}`);
  }
}

/**
 * Thrown when update input or output validation fails
 */
export class UpdateValidationError extends TypedClientError {
  constructor(
    public readonly updateName: string,
    public readonly direction: "input" | "output",
    public readonly issues: ReadonlyArray<StandardSchemaV1.Issue>,
  ) {
    super(`Validation failed for update "${updateName}" ${direction}: ${summarizeIssues(issues)}`);
  }
}
