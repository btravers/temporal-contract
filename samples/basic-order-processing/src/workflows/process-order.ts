import { type WorkflowImplementation, declareWorkflow } from "@temporal-contract/worker";
import { orderProcessingContract } from "../contract.js";
import type { OrderResult } from "../contract.js";

/**
 * Process Order Workflow Implementation
 *
 * This workflow orchestrates the order processing:
 * 1. Process payment
 * 2. Reserve inventory
 * 3. Create shipment
 * 4. Send notifications
 *
 * It handles failures by releasing inventory if needed.
 */
const implementation: WorkflowImplementation<
  typeof orderProcessingContract,
  "processOrder"
> = async (context, order): Promise<OrderResult> => {
  const { activities } = context;

  await activities.log({
    level: "info",
    message: `Starting order processing for ${order.orderId}`,
  });

  let reservationId: string | undefined;

  try {
    // Step 1: Process payment
    await activities.log({ level: "info", message: "Processing payment..." });
    const paymentResult = await activities.processPayment({
      customerId: order.customerId,
      amount: order.totalAmount,
    });

    if (paymentResult.status === "failed") {
      await activities.log({ level: "error", message: "Payment failed" });
      await activities.sendNotification({
        customerId: order.customerId,
        subject: "Order Failed",
        message: `Payment failed for order ${order.orderId}`,
      });

      return {
        orderId: order.orderId,
        status: "failed",
        failureReason: "Payment failed",
      };
    }

    await activities.log({
      level: "info",
      message: `Payment successful: ${paymentResult.transactionId}`,
    });

    // Step 2: Reserve inventory
    await activities.log({ level: "info", message: "Reserving inventory..." });
    const inventoryResult = await activities.reserveInventory(order.items);

    if (!inventoryResult.reserved) {
      await activities.log({ level: "error", message: "Inventory not available" });
      await activities.sendNotification({
        customerId: order.customerId,
        subject: "Order Failed",
        message: `Inventory not available for order ${order.orderId}. Refund has been initiated.`,
      });

      return {
        orderId: order.orderId,
        status: "failed",
        transactionId: paymentResult.transactionId,
        failureReason: "Inventory not available",
      };
    }

    reservationId = inventoryResult.reservationId;
    await activities.log({ level: "info", message: `Inventory reserved: ${reservationId}` });

    // Step 3: Create shipment
    await activities.log({ level: "info", message: "Creating shipment..." });
    const shipmentResult = await activities.createShipment({
      orderId: order.orderId,
      customerId: order.customerId,
    });

    await activities.log({
      level: "info",
      message: `Shipment created: ${shipmentResult.trackingNumber}`,
    });

    // Step 4: Send success notification
    await activities.sendNotification({
      customerId: order.customerId,
      subject: "Order Confirmed",
      message: `Your order ${order.orderId} has been confirmed! Tracking number: ${shipmentResult.trackingNumber}. Estimated delivery: ${shipmentResult.estimatedDelivery}`,
    });

    await activities.log({
      level: "info",
      message: `Order ${order.orderId} completed successfully`,
    });

    return {
      orderId: order.orderId,
      status: "completed",
      transactionId: paymentResult.transactionId,
      trackingNumber: shipmentResult.trackingNumber,
    };
  } catch (error) {
    // If something goes wrong, release inventory if it was reserved
    if (reservationId) {
      await activities.log({ level: "error", message: "Workflow failed, releasing inventory" });
      await activities.releaseInventory(reservationId);
    }

    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    await activities.log({ level: "error", message: `Order processing failed: ${errorMessage}` });
    await activities.sendNotification({
      customerId: order.customerId,
      subject: "Order Failed",
      message: `We encountered an issue processing your order ${order.orderId}. Our team will contact you shortly.`,
    });

    return {
      orderId: order.orderId,
      status: "failed",
      failureReason: errorMessage,
    };
  }
};

/**
 * Export the workflow for Temporal Worker
 */
export const processOrder = declareWorkflow({
  workflowName: "processOrder",
  contract: orderProcessingContract,
  implementation,
});
