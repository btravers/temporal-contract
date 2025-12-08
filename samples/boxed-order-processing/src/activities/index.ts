import { Future, Result } from "@swan-io/boxed";
import type { BoxedActivityImplementations } from "@temporal-contract/worker-boxed";
import type { ActivityError } from "@temporal-contract/worker-boxed";
import type { boxedOrderContract } from "../contract.js";
import type {
  PaymentResult,
  InventoryResult,
  ShippingResult,
} from "../contract.js";

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

const log = (
  level: "info" | "warn" | "error",
  message: string
): Future<Result<void, ActivityError>> => {
  return Future.make((resolve) => {
    const timestamp = new Date().toISOString();
    console.log(`[${timestamp}] [${level.toUpperCase()}] ${message}`);
    resolve(Result.Ok(undefined));
  });
};

const sendNotification = (
  customerId: string,
  subject: string,
  message: string
): Future<Result<{ sent: boolean; messageId?: string }, ActivityError>> => {
  return Future.make((resolve) => {
    // Simulate email service
    console.log(
      `📧 Sending notification to customer ${customerId}: ${subject}`
    );
    console.log(`   Message: ${message}`);

    // 95% success rate
    const success = Math.random() > 0.05;

    if (success) {
      resolve(
        Result.Ok({
          sent: true,
          messageId: `msg-${Date.now()}-${Math.random()
            .toString(36)
            .substring(7)}`,
        })
      );
    } else {
      resolve(
        Result.Error({
          code: "NOTIFICATION_FAILED",
          message: "Failed to send notification via email service",
          details: { customerId, subject },
        })
      );
    }
  });
};

// ============================================================================
// Workflow-Specific Activities
// ============================================================================

const processPayment = (
  customerId: string,
  amount: number
): Future<Result<PaymentResult, ActivityError>> => {
  return Future.make((resolve) => {
    console.log(`💳 Processing payment of $${amount} for customer ${customerId}`);

    // Simulate processing time
    setTimeout(() => {
      // 90% success rate
      const success = Math.random() > 0.1;

      if (success) {
        const transactionId = `txn-${Date.now()}-${Math.random()
          .toString(36)
          .substring(7)}`;
        console.log(`✓ Payment successful: ${transactionId}`);

        resolve(
          Result.Ok({
            transactionId,
            status: "success" as const,
            paidAmount: amount,
          })
        );
      } else {
        console.log(`✗ Payment failed for customer ${customerId}`);
        resolve(
          Result.Error({
            code: "PAYMENT_FAILED",
            message: "Payment declined by payment processor",
            details: {
              customerId,
              amount,
              reason: "Insufficient funds or card declined",
            },
          })
        );
      }
    }, 100);
  });
};

const reserveInventory = (
  items: Array<{ productId: string; quantity: number }>
): Future<Result<InventoryResult, ActivityError>> => {
  return Future.make((resolve) => {
    console.log(`📦 Reserving inventory for ${items.length} products`);

    // Simulate inventory check
    setTimeout(() => {
      // 95% success rate
      const available = Math.random() > 0.05;

      if (available) {
        const reservationId = `res-${Date.now()}-${Math.random()
          .toString(36)
          .substring(7)}`;
        console.log(`✓ Inventory reserved: ${reservationId}`);

        resolve(
          Result.Ok({
            reserved: true,
            reservationId,
          })
        );
      } else {
        // Pick a random item that's out of stock
        const outOfStockItem = items[Math.floor(Math.random() * items.length)];
        if (!outOfStockItem) {
          resolve(Result.Error({
            code: "OUT_OF_STOCK",
            message: "No items found to check stock",
            details: {},
          }));
          return;
        }
        console.log(`✗ Product ${outOfStockItem.productId} is out of stock`);

        resolve(
          Result.Error({
            code: "OUT_OF_STOCK",
            message: `Product ${outOfStockItem.productId} is out of stock`,
            details: {
              productId: outOfStockItem.productId,
              requestedQuantity: outOfStockItem.quantity,
              availableQuantity: Math.floor(outOfStockItem.quantity / 2),
            },
          })
        );
      }
    }, 150);
  });
};

const releaseInventory = (
  reservationId: string
): Future<Result<void, ActivityError>> => {
  return Future.make((resolve) => {
    console.log(`🔓 Releasing inventory reservation: ${reservationId}`);
    // Inventory release rarely fails
    resolve(Result.Ok(undefined));
  });
};

const createShipment = (
  orderId: string,
  customerId: string
): Future<Result<ShippingResult, ActivityError>> => {
  return Future.make((resolve) => {
    console.log(`📮 Creating shipment for order ${orderId}`);

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
          Date.now() + daysToDeliver * 24 * 60 * 60 * 1000
        ).toISOString();

        console.log(`✓ Shipment created: ${trackingNumber} via ${carrier}`);

        resolve(
          Result.Ok({
            trackingNumber,
            estimatedDelivery,
            carrier,
          })
        );
      } else {
        console.log(`✗ Failed to create shipment for order ${orderId}`);
        resolve(
          Result.Error({
            code: "SHIPMENT_FAILED",
            message: "Carrier service temporarily unavailable",
            details: {
              orderId,
              customerId,
              reason: "Carrier API error",
            },
          })
        );
      }
    }, 100);
  });
};

const refundPayment = (
  transactionId: string
): Future<Result<{ refunded: boolean; refundId?: string }, ActivityError>> => {
  return Future.make((resolve) => {
    console.log(`💰 Processing refund for transaction ${transactionId}`);

    setTimeout(() => {
      // 99% success rate (refunds rarely fail)
      const success = Math.random() > 0.01;

      if (success) {
        const refundId = `rfnd-${Date.now()}-${Math.random()
          .toString(36)
          .substring(7)}`;
        console.log(`✓ Refund successful: ${refundId}`);

        resolve(
          Result.Ok({
            refunded: true,
            refundId,
          })
        );
      } else {
        console.log(`✗ Refund failed for transaction ${transactionId}`);
        resolve(
          Result.Error({
            code: "REFUND_FAILED",
            message: "Payment processor rejected refund request",
            details: {
              transactionId,
              reason: "Transaction already refunded or too old",
            },
          })
        );
      }
    }, 100);
  });
};

// ============================================================================
// Export Activity Implementations
// ============================================================================

export const activities: BoxedActivityImplementations<typeof boxedOrderContract> = {
  log,
  sendNotification,
  processPayment,
  reserveInventory,
  releaseInventory,
  createShipment,
  refundPayment,
};
