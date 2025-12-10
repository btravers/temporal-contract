import { declareActivitiesHandler } from "@temporal-contract/worker/activity";
import { orderProcessingContract } from "./contract.js";
import {
  loggerAdapter,
  sendNotificationUseCase,
  processPaymentUseCase,
  reserveInventoryUseCase,
  releaseInventoryUseCase,
  createShipmentUseCase,
} from "../dependencies.js";

// ============================================================================
// Activities Handler
// ============================================================================

/**
 * Create the activities handler with all global and workflow-specific activities
 * Activities are thin wrappers that delegate to use cases
 */
export const activitiesHandler = declareActivitiesHandler({
  contract: orderProcessingContract,
  activities: {
    // Global activities
    log: async ({ level, message }) => {
      loggerAdapter.log(level, message);
    },

    sendNotification: async ({ customerId, subject, message }) => {
      await sendNotificationUseCase.execute(customerId, subject, message);
    },

    // processOrder workflow activities
    processPayment: async ({ customerId, amount }) => {
      return processPaymentUseCase.execute(customerId, amount);
    },

    reserveInventory: async (items) => {
      return reserveInventoryUseCase.execute(items);
    },

    releaseInventory: async (reservationId) => {
      await releaseInventoryUseCase.execute(reservationId);
    },

    createShipment: async ({ orderId, customerId }) => {
      return createShipmentUseCase.execute(orderId, customerId);
    },
  },
});
