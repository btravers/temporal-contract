import type { ZodError } from "zod";

/**
 * Base error class for worker-boxed errors
 */
export class WorkerBoxedError extends Error {
  constructor(message: string, cause?: unknown) {
    super(message, { cause });
    this.name = "WorkerBoxedError";
    // Maintains proper stack trace for where our error was thrown (only available on V8)
    if (Error.captureStackTrace) {
      Error.captureStackTrace(this, this.constructor);
    }
  }
}

/**
 * Error thrown when an activity definition is not found in the contract
 */
export class ActivityDefinitionNotFoundError extends WorkerBoxedError {
  constructor(
    public readonly activityName: string,
    public readonly availableDefinitions: readonly string[] = [],
  ) {
    const available = availableDefinitions.length > 0 ? availableDefinitions.join(", ") : "none";
    super(
      `Activity definition not found for: "${activityName}". Available activities: ${available}`,
    );
    this.name = "ActivityDefinitionNotFoundError";
  }
}

/**
 * Error thrown when activity input validation fails
 */
export class ActivityInputValidationError extends WorkerBoxedError {
  constructor(
    public readonly activityName: string,
    public readonly zodError: ZodError,
  ) {
    super(`Activity "${activityName}" input validation failed: ${zodError.message}`, zodError);
    this.name = "ActivityInputValidationError";
  }
}

/**
 * Error thrown when activity output validation fails
 */
export class ActivityOutputValidationError extends WorkerBoxedError {
  constructor(
    public readonly activityName: string,
    public readonly zodError: ZodError,
  ) {
    super(`Activity "${activityName}" output validation failed: ${zodError.message}`, zodError);
    this.name = "ActivityOutputValidationError";
  }
}
