import { Future, Result } from "@swan-io/boxed";
import { declareActivitiesHandler } from "@temporal-contract/worker-boxed/activity";
import { boxedOrderContract } from "./contract.js";
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
 *   - Result.Error({ code, message, details }) for failures
 *
 * Benefits:
 *   - Explicit error types in function signatures
 *   - Better testability (no try/catch needed)
 *   - Functional composition with map/flatMap/match
 *   - Type-safe error handling
 */

// ============================================================================
// Activities Handler
// ============================================================================

/**
 * Create the activities handler with Result/Future pattern
 * Activities are thin wrappers that delegate to use cases
 * All activities return Future<Result<T, ActivityError>>
 */
export const activitiesHandler = declareActivitiesHandler({
  contract: boxedOrderContract,
  activities: {
    // Global activities
    log: ({ level, message }) => {
      return Future.make((resolve) => {
        loggerAdapter.log(level, message);
        resolve(Result.Ok(undefined));
      });
    },

    sendNotification: ({ customerId, subject, message }) => {
      return sendNotificationUseCase.execute(customerId, subject, message);
    },

    // processOrder workflow activities
    processPayment: ({ customerId, amount }) => {
      return processPaymentUseCase.execute(customerId, amount);
    },

    reserveInventory: (items) => {
      return reserveInventoryUseCase.execute(items);
    },

    releaseInventory: (reservationId) => {
      return releaseInventoryUseCase.execute(reservationId);
    },

    createShipment: ({ orderId, customerId }) => {
      return createShipmentUseCase.execute(orderId, customerId);
    },

    refundPayment: (transactionId) => {
      return refundPaymentUseCase.execute(transactionId);
    },
  },
});
