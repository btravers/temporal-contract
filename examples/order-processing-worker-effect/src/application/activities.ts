import { Effect } from "effect";
import { declareActivitiesHandler, ActivityError } from "@temporal-contract/worker-effect";
import { orderEffectContract } from "../contract.js";
import { logger } from "../logger.js";
import {
  processPaymentUseCase,
  reserveInventoryUseCase,
  releaseInventoryUseCase,
  createShipmentUseCase,
  sendNotificationUseCase,
  refundPaymentUseCase,
} from "../dependencies.js";

export const activities = declareActivitiesHandler({
  contract: orderEffectContract,
  activities: {
    log: ({ level, message }) =>
      Effect.sync(() => {
        logger.info({ level }, message);
      }),

    sendNotification: ({ customerId, subject, message }) =>
      Effect.tryPromise({
        try: () => sendNotificationUseCase.execute(customerId, subject, message),
        catch: (error) =>
          new ActivityError({
            code: "NOTIFICATION_FAILED",
            message: error instanceof Error ? error.message : "Failed to send notification",
            cause: error,
          }),
      }),

    processOrder: {
      processPayment: ({ customerId, amount }) =>
        Effect.tryPromise({
          try: () => processPaymentUseCase.execute(customerId, amount),
          catch: (error) =>
            new ActivityError({
              code: "PAYMENT_FAILED",
              message: error instanceof Error ? error.message : "Payment processing failed",
              cause: error,
            }),
        }),

      reserveInventory: (items) =>
        Effect.tryPromise({
          try: () => reserveInventoryUseCase.execute([...items]),
          catch: (error) =>
            new ActivityError({
              code: "INVENTORY_RESERVATION_FAILED",
              message: error instanceof Error ? error.message : "Inventory reservation failed",
              cause: error,
            }),
        }),

      releaseInventory: (reservationId) =>
        Effect.tryPromise({
          try: () => releaseInventoryUseCase.execute(reservationId),
          catch: (error) =>
            new ActivityError({
              code: "INVENTORY_RELEASE_FAILED",
              message: error instanceof Error ? error.message : "Inventory release failed",
              cause: error,
            }),
        }),

      createShipment: ({ orderId, customerId }) =>
        Effect.tryPromise({
          try: () => createShipmentUseCase.execute(orderId, customerId),
          catch: (error) =>
            new ActivityError({
              code: "SHIPMENT_CREATION_FAILED",
              message: error instanceof Error ? error.message : "Shipment creation failed",
              cause: error,
            }),
        }),

      refundPayment: (transactionId) =>
        Effect.tryPromise({
          try: () => refundPaymentUseCase.execute(transactionId),
          catch: (error) =>
            new ActivityError({
              code: "REFUND_FAILED",
              message: error instanceof Error ? error.message : "Refund failed",
              cause: error,
            }),
        }),
    },
  },
});
