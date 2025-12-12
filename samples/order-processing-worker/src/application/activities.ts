import { Future, Result } from "@swan-io/boxed";
import { declareActivitiesHandler, ActivityError } from "@temporal-contract/worker/activity";
import { orderProcessingContract } from "@temporal-contract/sample-order-processing-contract";
import {
  loggerAdapter,
  sendNotificationUseCase,
  processPaymentUseCase,
  reserveInventoryUseCase,
  releaseInventoryUseCase,
  createShipmentUseCase,
  refundPaymentUseCase,
} from "../dependencies.js";

/**
 * Activity implementations using the Result/Future pattern from @swan-io/boxed
 *
 * Instead of throwing exceptions, activities return:
 *   - Result.Ok(value) for success
 *   - Result.Error(ActivityError) for failures
 *
 * All technical exceptions MUST be caught and wrapped in ActivityError.
 * This ensures proper retry policies and error handling in Temporal.
 *
 * Benefits:
 *   - Explicit error types in function signatures
 *   - Better testability (no try/catch needed)
 *   - Functional composition with map/flatMap/match
 *   - Type-safe error handling
 *   - Controlled retry behavior via ActivityError
 */

// ============================================================================
// Activities Handler
// ============================================================================

/**
 * Create the activities handler with Result/Future pattern
 * Activities are thin wrappers that delegate to use cases
 * All activities return Future<Result<T, ActivityError>>
 *
 * Domain errors are wrapped in ActivityError to enable Temporal retry policies.
 */
export const activitiesHandler = declareActivitiesHandler({
  contract: orderProcessingContract,
  activities: {
    // Global activities
    log: ({ level, message }) => {
      loggerAdapter.log(level, message);
      return Future.value(Result.Ok(undefined));
    },

    sendNotification: ({ customerId, subject, message }) => {
      return sendNotificationUseCase.execute(customerId, subject, message).mapError(
        (domainError) =>
          // Convert domain error to ActivityError for retry handling
          new ActivityError(domainError.code, domainError.message, domainError.details),
      );
    },

    // processOrder workflow activities
    processPayment: ({ customerId, amount }) => {
      return processPaymentUseCase.execute(customerId, amount).mapError(
        (domainError) =>
          // ⚠️ CRITICAL: Requalify all domain errors as ActivityError
          //
          // This is REQUIRED for Temporal's retry mechanism to work properly:
          // 1. Domain layer returns Result.Error({ code, message, details })
          // 2. Activity layer MUST wrap it in ActivityError (extends Error)
          // 3. Temporal can then:
          //    - Apply retry policies based on error type
          //    - Track failures properly in workflow history
          //    - Enable proper error handling in workflows
          //
          // Without this, errors would not trigger retries correctly!
          new ActivityError(domainError.code, domainError.message, domainError.details),
      );
    },

    reserveInventory: (items) => {
      return reserveInventoryUseCase
        .execute(items)
        .mapError(
          (domainError) =>
            new ActivityError(domainError.code, domainError.message, domainError.details),
        );
    },

    releaseInventory: (reservationId) => {
      return releaseInventoryUseCase
        .execute(reservationId)
        .mapError(
          (domainError) =>
            new ActivityError(domainError.code, domainError.message, domainError.details),
        );
    },

    createShipment: ({ orderId, customerId }) => {
      return createShipmentUseCase
        .execute(orderId, customerId)
        .mapError(
          (domainError) =>
            new ActivityError(domainError.code, domainError.message, domainError.details),
        );
    },

    refundPayment: (transactionId) => {
      return refundPaymentUseCase
        .execute(transactionId)
        .mapError(
          (domainError) =>
            new ActivityError(domainError.code, domainError.message, domainError.details),
        );
    },
  },
});
