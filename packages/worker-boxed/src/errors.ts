import type { ZodError } from "zod";

/**
 * Base error class for worker-boxed errors
 */
export class WorkerBoxedError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "WorkerBoxedError";
  }
}

/**
 * Error thrown when an activity definition is not found in the contract
 */
export class ActivityDefinitionNotFoundError extends WorkerBoxedError {
  constructor(
    public readonly activityName: string,
    public readonly availableDefinitions: string[],
  ) {
    super(
      `Activity definition not found for: ${activityName}.\nAvailable activities: ${availableDefinitions.join(", ")}`,
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
    super(`Activity "${activityName}" input validation failed: ${zodError.message}`);
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
    super(`Activity "${activityName}" output validation failed: ${zodError.message}`);
    this.name = "ActivityOutputValidationError";
  }
}
