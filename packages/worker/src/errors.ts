import type { z } from "zod";

/**
 * Base error class for worker errors
 */
export class WorkerError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "WorkerError";
    // Maintains proper stack trace for where our error was thrown (only available on V8)
    if (Error.captureStackTrace) {
      Error.captureStackTrace(this, this.constructor);
    }
  }
}

/**
 * Error thrown when an activity implementation is not found
 */
export class ActivityImplementationNotFoundError extends WorkerError {
  constructor(
    public readonly activityName: string,
    public readonly availableActivities: readonly string[],
  ) {
    super(
      `Activity implementation not found for: "${activityName}". ` +
        `Available activities: ${availableActivities.length > 0 ? availableActivities.join(", ") : "none"}`,
    );
    this.name = "ActivityImplementationNotFoundError";
  }
}

/**
 * Error thrown when an activity definition is not found in the contract
 */
export class ActivityDefinitionNotFoundError extends WorkerError {
  constructor(
    public readonly activityName: string,
    public readonly availableDefinitions: readonly string[],
  ) {
    super(
      `Activity definition not found in contract for: "${activityName}". ` +
        `Available definitions: ${availableDefinitions.length > 0 ? availableDefinitions.join(", ") : "none"}`,
    );
    this.name = "ActivityDefinitionNotFoundError";
  }
}

/**
 * Error thrown when activity input validation fails
 */
export class ActivityInputValidationError extends WorkerError {
  constructor(
    public readonly activityName: string,
    public readonly zodError: z.ZodError,
  ) {
    super(`Activity "${activityName}" input validation failed: ${zodError.message}`);
    this.name = "ActivityInputValidationError";
  }
}

/**
 * Error thrown when activity output validation fails
 */
export class ActivityOutputValidationError extends WorkerError {
  constructor(
    public readonly activityName: string,
    public readonly zodError: z.ZodError,
  ) {
    super(`Activity "${activityName}" output validation failed: ${zodError.message}`);
    this.name = "ActivityOutputValidationError";
  }
}

/**
 * Error thrown when workflow input validation fails
 */
export class WorkflowInputValidationError extends WorkerError {
  constructor(
    public readonly workflowName: string,
    public readonly zodError: z.ZodError,
  ) {
    super(`Workflow "${workflowName}" input validation failed: ${zodError.message}`);
    this.name = "WorkflowInputValidationError";
  }
}

/**
 * Error thrown when workflow output validation fails
 */
export class WorkflowOutputValidationError extends WorkerError {
  constructor(
    public readonly workflowName: string,
    public readonly zodError: z.ZodError,
  ) {
    super(`Workflow "${workflowName}" output validation failed: ${zodError.message}`);
    this.name = "WorkflowOutputValidationError";
  }
}

/**
 * Error thrown when signal input validation fails
 */
export class SignalInputValidationError extends WorkerError {
  constructor(
    public readonly signalName: string,
    public readonly zodError: z.ZodError,
  ) {
    super(`Signal "${signalName}" input validation failed: ${zodError.message}`);
    this.name = "SignalInputValidationError";
  }
}

/**
 * Error thrown when query input validation fails
 */
export class QueryInputValidationError extends WorkerError {
  constructor(
    public readonly queryName: string,
    public readonly zodError: z.ZodError,
  ) {
    super(`Query "${queryName}" input validation failed: ${zodError.message}`);
    this.name = "QueryInputValidationError";
  }
}

/**
 * Error thrown when query output validation fails
 */
export class QueryOutputValidationError extends WorkerError {
  constructor(
    public readonly queryName: string,
    public readonly zodError: z.ZodError,
  ) {
    super(`Query "${queryName}" output validation failed: ${zodError.message}`);
    this.name = "QueryOutputValidationError";
  }
}

/**
 * Error thrown when update input validation fails
 */
export class UpdateInputValidationError extends WorkerError {
  constructor(
    public readonly updateName: string,
    public readonly zodError: z.ZodError,
  ) {
    super(`Update "${updateName}" input validation failed: ${zodError.message}`);
    this.name = "UpdateInputValidationError";
  }
}

/**
 * Error thrown when update output validation fails
 */
export class UpdateOutputValidationError extends WorkerError {
  constructor(
    public readonly updateName: string,
    public readonly zodError: z.ZodError,
  ) {
    super(`Update "${updateName}" output validation failed: ${zodError.message}`);
    this.name = "UpdateOutputValidationError";
  }
}
