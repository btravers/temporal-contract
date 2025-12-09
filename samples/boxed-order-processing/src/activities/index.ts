import { Future, Result } from "@swan-io/boxed";
import { declareActivitiesHandler } from "@temporal-contract/worker-boxed";
import type {
  BoxedActivityHandler,
  BoxedWorkflowActivityHandler,
} from "@temporal-contract/worker-boxed";
import { boxedOrderContract } from "../contract.js";
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
// Global Activities
// ============================================================================

const log: BoxedActivityHandler<typeof boxedOrderContract, "log"> = ({
  level,
  message,
}: {
  level: string;
  message: string;
}) => {
  return Future.make((resolve) => {
    const logLevel = level.toLowerCase();
    // Type guard pour vérifier que logLevel est un niveau valide
    if (
      logLevel === "info" ||
      logLevel === "warn" ||
      logLevel === "error" ||
      logLevel === "debug" ||
      logLevel === "fatal" ||
      logLevel === "trace"
    ) {
      logger[logLevel](message);
    } else {
      logger.info(message);
    }
    resolve(Result.Ok(undefined));
  });
};

const sendNotification: BoxedActivityHandler<typeof boxedOrderContract, "sendNotification"> = ({
  customerId,
  subject,
  message,
}: {
  customerId: string;
  subject: string;
  message: string;
}) => {
  return Future.make((resolve) => {
    logger.info({ customerId, subject }, `📧 Sending notification to customer ${customerId}`);
    logger.info({ subject, message }, `   Subject: ${subject}`);

    setTimeout(() => {
      // 98% success rate for notifications
      const success = Math.random() > 0.02;

      if (success) {
        const messageId = `msg-${Date.now()}-${Math.random().toString(36).substring(7)}`;
        logger.info({ messageId }, `✓ Notification sent successfully: ${messageId}`);

        resolve(Result.Ok(undefined));
      } else {
        logger.error({ customerId }, `✗ Failed to send notification to ${customerId}`);
        resolve(
          Result.Error({
            code: "NOTIFICATION_FAILED",
            message: "Failed to send customer notification",
            details: {
              customerId,
              subject,
            },
          }),
        );
      }
    }, 100);
  });
};

// ============================================================================
// Workflow-Specific Activities
// ============================================================================

const processPayment: BoxedWorkflowActivityHandler<
  typeof boxedOrderContract,
  "processOrder",
  "processPayment"
> = ({ customerId, amount }: { customerId: string; amount: number }) => {
  return Future.make((resolve) => {
    logger.info(
      { customerId, amount },
      `💳 Processing payment of $${amount} for customer ${customerId}`,
    );

    // Simulate processing time
    setTimeout(() => {
      // 90% success rate
      const success = Math.random() > 0.1;

      if (success) {
        const transactionId = `txn-${Date.now()}-${Math.random().toString(36).substring(7)}`;
        logger.info({ transactionId }, `✓ Payment successful: ${transactionId}`);

        resolve(
          Result.Ok({
            transactionId,
            status: "success" as const,
            paidAmount: amount,
          }),
        );
      } else {
        logger.error({ customerId }, `✗ Payment failed for customer ${customerId}`);
        resolve(
          Result.Error({
            code: "PAYMENT_FAILED",
            message: "Payment declined by payment processor",
            details: {
              customerId,
              amount,
              reason: "Insufficient funds or card declined",
            },
          }),
        );
      }
    }, 100);
  });
};

const reserveInventory: BoxedWorkflowActivityHandler<
  typeof boxedOrderContract,
  "processOrder",
  "reserveInventory"
> = (items: { productId: string; quantity: number }[]) => {
  return Future.make((resolve) => {
    logger.info({ itemCount: items.length }, `📦 Reserving inventory for ${items.length} products`);

    // Simulate inventory check
    setTimeout(() => {
      // 95% success rate
      const available = Math.random() > 0.05;

      if (available) {
        const reservationId = `res-${Date.now()}-${Math.random().toString(36).substring(7)}`;
        logger.info({ reservationId }, `✓ Inventory reserved: ${reservationId}`);

        resolve(
          Result.Ok({
            reserved: true,
            reservationId,
          }),
        );
      } else {
        // Pick a random item that's out of stock
        const outOfStockItem = items[Math.floor(Math.random() * items.length)];
        if (!outOfStockItem) {
          resolve(
            Result.Error({
              code: "OUT_OF_STOCK",
              message: "No items found to check stock",
              details: {},
            }),
          );
          return;
        }
        logger.error(
          { productId: outOfStockItem.productId },
          `✗ Product ${outOfStockItem.productId} is out of stock`,
        );

        resolve(
          Result.Error({
            code: "OUT_OF_STOCK",
            message: `Product ${outOfStockItem.productId} is out of stock`,
            details: {
              productId: outOfStockItem.productId,
              requestedQuantity: outOfStockItem.quantity,
              availableQuantity: Math.floor(outOfStockItem.quantity / 2),
            },
          }),
        );
      }
    }, 150);
  });
};

const releaseInventory: BoxedWorkflowActivityHandler<
  typeof boxedOrderContract,
  "processOrder",
  "releaseInventory"
> = (reservationId: string) => {
  return Future.make((resolve) => {
    logger.info({ reservationId }, `🔓 Releasing inventory reservation: ${reservationId}`);
    // Inventory release rarely fails
    resolve(Result.Ok(undefined));
  });
};

const createShipment: BoxedWorkflowActivityHandler<
  typeof boxedOrderContract,
  "processOrder",
  "createShipment"
> = ({ orderId, customerId }: { orderId: string; customerId: string }) => {
  return Future.make((resolve) => {
    logger.info({ orderId }, `📮 Creating shipment for order ${orderId}`);

    setTimeout(() => {
      // 98% success rate
      const success = Math.random() > 0.02;

      if (success) {
        const trackingNumber = `TRK-${Date.now()}-${Math.random()
          .toString(36)
          .substring(7)
          .toUpperCase()}`;
        const carriers = ["FedEx", "UPS", "USPS", "DHL"];
        const carrier = carriers[Math.floor(Math.random() * carriers.length)] ?? "FedEx";

        // Estimated delivery: 3-7 days
        const daysToDeliver = 3 + Math.floor(Math.random() * 5);
        const estimatedDelivery = new Date(
          Date.now() + daysToDeliver * 24 * 60 * 60 * 1000,
        ).toISOString();

        logger.info(
          { trackingNumber, carrier },
          `✓ Shipment created: ${trackingNumber} via ${carrier}`,
        );

        resolve(
          Result.Ok({
            trackingNumber,
            estimatedDelivery,
            carrier,
          }),
        );
      } else {
        logger.error({ orderId }, `✗ Failed to create shipment for order ${orderId}`);
        resolve(
          Result.Error({
            code: "SHIPMENT_FAILED",
            message: "Carrier service temporarily unavailable",
            details: {
              orderId,
              customerId,
              reason: "Carrier API error",
            },
          }),
        );
      }
    }, 100);
  });
};

const refundPayment: BoxedWorkflowActivityHandler<
  typeof boxedOrderContract,
  "processOrder",
  "refundPayment"
> = (transactionId: string) => {
  return Future.make((resolve) => {
    logger.info({ transactionId }, `💰 Processing refund for transaction ${transactionId}`);

    setTimeout(() => {
      // 99% success rate (refunds rarely fail)
      const success = Math.random() > 0.01;

      if (success) {
        const refundId = `rfnd-${Date.now()}-${Math.random().toString(36).substring(7)}`;
        logger.info({ refundId }, `✓ Refund successful: ${refundId}`);

        resolve(Result.Ok(undefined));
      } else {
        logger.error({ transactionId }, `✗ Refund failed for transaction ${transactionId}`);
        resolve(
          Result.Error({
            code: "REFUND_FAILED",
            message: "Payment processor rejected refund request",
            details: {
              transactionId,
              reason: "Transaction already refunded or too old",
            },
          }),
        );
      }
    }, 100);
  });
};

// ============================================================================
// Activities Handler
// ============================================================================

/**
 * Create the activities handler with Result/Future pattern
 * All activities return Future<Result<T, ActivityError>>
 */
export const activitiesHandler = declareActivitiesHandler({
  contract: boxedOrderContract,
  activities: {
    log,
    sendNotification,
    processPayment,
    reserveInventory,
    releaseInventory,
    createShipment,
    refundPayment,
  },
});
