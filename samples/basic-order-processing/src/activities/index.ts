import { declareActivitiesHandler } from "@temporal-contract/worker";
import type { ActivityHandler, WorkflowActivityHandler } from "@temporal-contract/contract";
import { orderProcessingContract } from "../contract.js";
import { pino } from "pino";

const logger = pino({
  transport: {
    target: "pino-pretty",
    options: {
      colorize: true,
      translateTime: "SYS:standard",
      ignore: "pid,hostname",
    },
  },
});

// ============================================================================
// Global Activities Implementation
// ============================================================================

const log: ActivityHandler<typeof orderProcessingContract, "log"> = async ({ level, message }) => {
  logger[level](message);
};

const sendNotification: ActivityHandler<
  typeof orderProcessingContract,
  "sendNotification"
> = async ({ customerId, subject, message }) => {
  logger.info({ customerId, subject }, `📧 Sending notification to ${customerId}`);
  logger.info({ subject, message }, `   Subject: ${subject}`);
  logger.info({ customerId }, `✅ Notification sent to ${customerId}`);
};

// ============================================================================
// Workflow-Specific Activities Implementation
// ============================================================================

const processPayment: WorkflowActivityHandler<
  typeof orderProcessingContract,
  "processOrder",
  "processPayment"
> = async ({ customerId, amount }) => {
  logger.info(
    { customerId, amount },
    `💳 Processing payment of $${amount} for customer ${customerId}`,
  );

  // Simulate random payment failure (10% chance)
  const success = Math.random() > 0.1;

  const result = {
    transactionId: `TXN${Date.now()}`,
    status: success ? ("success" as const) : ("failed" as const),
    paidAmount: success ? amount : 0,
  };

  if (success) {
    logger.info(
      { transactionId: result.transactionId },
      `✅ Payment processed: ${result.transactionId}`,
    );
  } else {
    logger.error(`❌ Payment failed`);
  }

  return result;
};

const reserveInventory: WorkflowActivityHandler<
  typeof orderProcessingContract,
  "processOrder",
  "reserveInventory"
> = async (items) => {
  logger.info({ itemCount: items.length }, `📦 Reserving inventory for ${items.length} items`);

  // All items available
  const reservationId = `RES${Date.now()}`;
  const result = {
    reserved: true,
    reservationId,
  };

  logger.info({ reservationId }, `✅ Inventory reserved: ${reservationId}`);
  return result;
};

const releaseInventory: WorkflowActivityHandler<
  typeof orderProcessingContract,
  "processOrder",
  "releaseInventory"
> = async (reservationId) => {
  logger.info({ reservationId }, `🔓 Releasing inventory reservation: ${reservationId}`);
  logger.info(`✅ Inventory released`);
};

const createShipment: WorkflowActivityHandler<
  typeof orderProcessingContract,
  "processOrder",
  "createShipment"
> = async ({ orderId, customerId: _customerId }) => {
  logger.info({ orderId }, `📮 Creating shipment for order ${orderId}`);

  const trackingNumber = `TRACK${Date.now()}${Math.random().toString(36).substring(2, 8).toUpperCase()}`;
  const estimatedDelivery = new Date(Date.now() + 3 * 24 * 60 * 60 * 1000).toISOString();

  const result = {
    trackingNumber,
    estimatedDelivery,
  };

  logger.info({ trackingNumber }, `✅ Shipment created: ${trackingNumber}`);
  return result;
};

// ============================================================================
// Activities Handler
// ============================================================================

/**
 * Create the activities handler with all global and workflow-specific activities
 */
export const activitiesHandler = declareActivitiesHandler({
  contract: orderProcessingContract,
  activities: {
    // Global activities (from contract.activities)
    log,
    sendNotification,

    // processOrder workflow activities (flattened, not nested)
    processPayment,
    reserveInventory,
    releaseInventory,
    createShipment,
  },
});
