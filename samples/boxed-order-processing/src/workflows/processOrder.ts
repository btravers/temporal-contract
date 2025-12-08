import type { WorkflowImplementation } from "@temporal-contract/worker-boxed";
import type { boxedOrderContract } from "../contract.js";
import type { OrderResult, PaymentResult, InventoryResult, ShippingResult } from "../contract.js";

/**
 * Process Order Workflow Implementation
 * 
 * This workflow demonstrates error handling with the Result/Future pattern.
 * While activities return Result<T, E>, they are automatically unwrapped by the
 * worker-boxed handler, so workflow code looks similar to the standard approach.
 * 
 * The key difference is that activities have explicit error types in their
 * signatures, making error handling more type-safe.
 * 
 * Flow:
 * 1. Log order start
 * 2. Process payment
 * 3. Reserve inventory
 * 4. Create shipment
 * 5. Send confirmation
 * 
 * On failure at any step:
 * - Rollback previous steps (release inventory, refund payment)
 * - Log failure
 * - Send failure notification
 * - Return failed status with reason
 */
export const processOrderWorkflow: WorkflowImplementation<
  typeof boxedOrderContract.workflows.processOrder,
  typeof boxedOrderContract
> = async (context, order) => {
  const { activities, info } = context;

  // State tracking for rollback
  let paymentTransactionId: string | undefined;
  let inventoryReservationId: string | undefined;

  try {
    // Step 1: Log order start
    await activities.log(
      "info",
      `Starting order processing for ${order.orderId} (workflow: ${info.workflowId})`
    );

    // Step 2: Process payment
    await activities.log("info", `Processing payment of $${order.totalAmount}`);
    const paymentResult = await activities.processPayment(
      order.customerId,
      order.totalAmount
    ) as PaymentResult;

    if (paymentResult.status === "failed") {
      throw new Error("Payment failed: Card declined");
    }

    paymentTransactionId = paymentResult.transactionId;
    await activities.log("info", `Payment successful: ${paymentTransactionId}`);

    // Step 3: Reserve inventory
    await activities.log("info", "Reserving inventory");
    const inventoryResult = await activities.reserveInventory(order.items) as InventoryResult;

    if (!inventoryResult.reserved) {
      throw new Error("Inventory reservation failed");
    }

    inventoryReservationId = inventoryResult.reservationId;
    await activities.log(
      "info",
      `Inventory reserved: ${inventoryReservationId}`
    );

    // Step 4: Create shipment
    await activities.log("info", "Creating shipment");
    const shippingResult = await activities.createShipment(
      order.orderId,
      order.customerId
    ) as ShippingResult;

    await activities.log(
      "info",
      `Shipment created: ${shippingResult.trackingNumber}`
    );

    // Step 5: Send success notification
    try {
      await activities.sendNotification(
        order.customerId,
        "Order Confirmed",
        `Your order ${order.orderId} has been confirmed and will be shipped via ${shippingResult.carrier}. Tracking: ${shippingResult.trackingNumber}`
      );
    } catch (error) {
      // Non-critical: log but continue
      await activities.log(
        "warn",
        `Failed to send confirmation notification: ${error}`
      );
    }

    // Success!
    await activities.log("info", `Order ${order.orderId} processed successfully`);

    return {
      orderId: order.orderId,
      status: "completed" as const,
      transactionId: paymentTransactionId,
      trackingNumber: shippingResult.trackingNumber,
    };
  } catch (error) {
    // Workflow failed - perform rollback
    await activities.log(
      "error",
      `Order processing failed: ${error instanceof Error ? error.message : String(error)}`
    );

    const errorMessage =
      error instanceof Error ? error.message : String(error);
    let failureReason = errorMessage;
    let errorCode = "UNKNOWN_ERROR";

    // Extract error code if available
    if (errorMessage.includes("Payment")) {
      errorCode = "PAYMENT_FAILED";
      failureReason = "Payment was declined";
    } else if (errorMessage.includes("Inventory") || errorMessage.includes("stock")) {
      errorCode = "OUT_OF_STOCK";
      failureReason = "One or more items are out of stock";
    } else if (errorMessage.includes("Shipment")) {
      errorCode = "SHIPMENT_FAILED";
      failureReason = "Failed to create shipment";
    }

    // Rollback: Release inventory if reserved
    if (inventoryReservationId) {
      try {
        await activities.log("info", "Rolling back: releasing inventory");
        await activities.releaseInventory(inventoryReservationId);
        await activities.log("info", "Inventory released successfully");
      } catch (releaseError) {
        await activities.log(
          "error",
          `Failed to release inventory: ${releaseError}`
        );
      }
    }

    // Rollback: Refund payment if processed
    if (paymentTransactionId) {
      try {
        await activities.log("info", "Rolling back: refunding payment");
        const refundResult = await activities.refundPayment(
          paymentTransactionId
        ) as { refunded: boolean; refundId?: string };
        if (refundResult.refunded) {
          await activities.log(
            "info",
            `Payment refunded: ${refundResult.refundId}`
          );
        }
      } catch (refundError) {
        await activities.log(
          "error",
          `Failed to refund payment: ${refundError}`
        );
      }
    }

    // Send failure notification
    try {
      await activities.sendNotification(
        order.customerId,
        "Order Failed",
        `We're sorry, but your order ${order.orderId} could not be processed. Reason: ${failureReason}. Any charges have been refunded.`
      );
    } catch (notificationError) {
      await activities.log(
        "warn",
        `Failed to send failure notification: ${notificationError}`
      );
    }

    await activities.log("info", `Order ${order.orderId} processing cancelled`);

    // Return failed result
    return {
      orderId: order.orderId,
      status: "failed" as const,
      failureReason,
      errorCode,
    };
  }
};
