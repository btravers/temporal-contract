import { Future, Result } from "@swan-io/boxed";
import { declareActivitiesHandler, ApplicationFailure } from "@temporal-contract/worker/activity";
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
 * Translate an arbitrary thrown value into a Temporal `ApplicationFailure`.
 * Used by every activity below to wrap use-case rejections in the
 * `Result.Error` slot without each site repeating the boilerplate.
 */
const toApplicationFailure = (type: string, fallback: string, error: unknown): ApplicationFailure =>
  ApplicationFailure.create({
    type,
    message: error instanceof Error ? error.message : fallback,
    ...(error instanceof Error ? { cause: error } : {}),
  });

/**
 * Activity implementations using the Result/Future pattern from @swan-io/boxed.
 *
 * Instead of throwing exceptions, activities return:
 *   - Result.Ok(value) for success
 *   - Result.Error(ApplicationFailure) for failures
 *
 * All technical exceptions MUST be caught and wrapped in `ApplicationFailure`
 * (Temporal's first-class failure shape, re-exported from
 * `@temporal-contract/worker/activity` for convenience). Per-instance
 * `nonRetryable: true` opts a specific failure out of the configured
 * retry policy.
 *
 * Benefits:
 *   - Explicit error types in function signatures
 *   - Per-instance `nonRetryable` flag for permanent failures
 *   - Functional composition with map/flatMap/match
 *   - Native Temporal serialization across the activity → workflow boundary
 */

// ============================================================================
// Activities Handler
// ============================================================================

/**
 * Create the activities handler with Result/Future pattern.
 * Activities are thin wrappers that delegate to use cases.
 * All activities return `Future<Result<T, ApplicationFailure>>`.
 *
 * Domain errors are wrapped in `ApplicationFailure` so Temporal applies the
 * configured retry policy. Set `nonRetryable: true` for permanent failures
 * (e.g. validation rejections, insufficient funds).
 */
export const activities = declareActivitiesHandler({
  contract: orderProcessingContract,
  activities: {
    log: ({ level, message }) => {
      loggerAdapter.log(level, message);
      return Future.value(Result.Ok(undefined));
    },

    sendNotification: ({ customerId, subject, message }) => {
      return Future.fromPromise(
        sendNotificationUseCase.execute(customerId, subject, message),
      ).mapError((error) =>
        toApplicationFailure("NOTIFICATION_FAILED", "Failed to send notification", error),
      );
    },

    processOrder: {
      processPayment: ({ customerId, amount }) => {
        return Future.fromPromise(processPaymentUseCase.execute(customerId, amount)).mapError(
          (error) => toApplicationFailure("PAYMENT_FAILED", "Payment processing failed", error),
        );
      },

      reserveInventory: (items) => {
        return Future.fromPromise(reserveInventoryUseCase.execute(items)).mapError((error) =>
          toApplicationFailure(
            "INVENTORY_RESERVATION_FAILED",
            "Inventory reservation failed",
            error,
          ),
        );
      },

      releaseInventory: (reservationId) => {
        return Future.fromPromise(releaseInventoryUseCase.execute(reservationId)).mapError(
          (error) =>
            toApplicationFailure("INVENTORY_RELEASE_FAILED", "Inventory release failed", error),
        );
      },

      createShipment: ({ orderId, customerId }) => {
        return Future.fromPromise(createShipmentUseCase.execute(orderId, customerId)).mapError(
          (error) =>
            toApplicationFailure("SHIPMENT_CREATION_FAILED", "Shipment creation failed", error),
        );
      },

      refundPayment: (transactionId) => {
        return Future.fromPromise(refundPaymentUseCase.execute(transactionId)).mapError((error) =>
          toApplicationFailure("REFUND_FAILED", "Refund failed", error),
        );
      },
    },
  },
});
