import { Data } from "effect";
import type { ParseError } from "effect/ParseResult";

/**
 * Activity error — wrap technical exceptions in this before returning from an
 * activity so Temporal can apply retry policies correctly.
 *
 * Extends `Error` (via `Data.TaggedError`) so Temporal's retry machinery
 * continues to work correctly.
 *
 * @example
 * ```ts
 * import { Effect } from "effect";
 * import { ActivityError } from "@temporal-contract/worker-effect";
 *
 * const chargePayment = (args: { amount: number }) =>
 *   Effect.tryPromise({
 *     try: () => paymentService.charge(args.amount),
 *     catch: (e) =>
 *       new ActivityError({
 *         code: "CHARGE_FAILED",
 *         message: "Failed to charge payment",
 *         cause: e,
 *       }),
 *   });
 * ```
 */
export class ActivityError extends Data.TaggedError("ActivityError")<{
  readonly code: string;
  readonly message: string;
  readonly cause?: unknown;
}> {}

/**
 * Error raised when an activity definition is not found in the contract
 */
export class ActivityDefinitionNotFoundError extends Data.TaggedError(
  "ActivityDefinitionNotFoundError",
)<{
  readonly activityName: string;
  readonly availableActivities: readonly string[];
}> {}

/**
 * Error raised when activity input fails schema validation
 */
export class ActivityInputValidationError extends Data.TaggedError("ActivityInputValidationError")<{
  readonly activityName: string;
  readonly parseError: ParseError;
}> {}

/**
 * Error raised when activity output fails schema validation
 */
export class ActivityOutputValidationError extends Data.TaggedError(
  "ActivityOutputValidationError",
)<{
  readonly activityName: string;
  readonly parseError: ParseError;
}> {}
