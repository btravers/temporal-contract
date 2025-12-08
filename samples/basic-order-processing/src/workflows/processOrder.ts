import { createWorkflow, type WorkflowImplementation } from "@temporal-contract/worker";
import { orderProcessingContract } from "../contract.js";
import type { Order, OrderResult, PaymentResult, InventoryResult, ShippingResult } from "../contract.js";

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
  typeof orderProcessingContract.workflows.processOrder,
  typeof orderProcessingContract
> = async (context, order: Order): Promise<OrderResult> => {
  const { activities } = context;

  await activities.log("info", `Starting order processing for ${order.orderId}`);

  let reservationId: string | undefined;

  try {
    // Step 1: Process payment
    await activities.log("info", "Processing payment...");
    const processPaymentFn = activities['processPayment'];
    if (!processPaymentFn) {
      throw new Error('processPayment activity not found');
    }
    const paymentResult = await processPaymentFn(
      order.customerId,
      order.totalAmount
    ) as PaymentResult;

    if (paymentResult.status === "failed") {
      await activities.log("error", "Payment failed");
      await activities.sendNotification(
        order.customerId,
        "Order Failed",
        `Payment failed for order ${order.orderId}`
      );

      return {
        orderId: order.orderId,
        status: "failed",
        failureReason: "Payment failed",
      };
    }

    await activities.log("info", `Payment successful: ${paymentResult.transactionId}`);

    // Step 2: Reserve inventory
    await activities.log("info", "Reserving inventory...");
    const reserveInventoryFn = activities['reserveInventory'];
    if (!reserveInventoryFn) {
      throw new Error('reserveInventory activity not found');
    }
    const inventoryResult = await reserveInventoryFn(order.items) as InventoryResult;

    if (!inventoryResult.reserved) {
      await activities.log("error", "Inventory not available");
      await activities.sendNotification(
        order.customerId,
        "Order Failed",
        `Inventory not available for order ${order.orderId}. Refund has been initiated.`
      );

      return {
        orderId: order.orderId,
        status: "failed",
        transactionId: paymentResult.transactionId,
        failureReason: "Inventory not available",
      };
    }

    reservationId = inventoryResult.reservationId;
    await activities.log("info", `Inventory reserved: ${reservationId}`);

    // Step 3: Create shipment
    await activities.log("info", "Creating shipment...");
    const createShipmentFn = activities['createShipment'];
    if (!createShipmentFn) {
      throw new Error('createShipment activity not found');
    }
    const shipmentResult = await createShipmentFn(
      order.orderId,
      order.customerId
    ) as ShippingResult;

    await activities.log(
      "info",
      `Shipment created: ${shipmentResult.trackingNumber}`
    );

    // Step 4: Send success notification
    await activities.sendNotification(
      order.customerId,
      "Order Confirmed",
      `Your order ${order.orderId} has been confirmed! Tracking number: ${shipmentResult.trackingNumber}. Estimated delivery: ${shipmentResult.estimatedDelivery}`
    );

    await activities.log("info", `Order ${order.orderId} completed successfully`);

    return {
      orderId: order.orderId,
      status: "completed",
      transactionId: paymentResult.transactionId,
      trackingNumber: shipmentResult.trackingNumber,
    };
  } catch (error) {
    // If something goes wrong, release inventory if it was reserved
    if (reservationId) {
      await activities.log("error", "Workflow failed, releasing inventory");
      const releaseInventoryFn = activities['releaseInventory'];
      if (!releaseInventoryFn) {
        throw new Error('releaseInventory activity not found');
      }
      await releaseInventoryFn(reservationId);
    }

    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    await activities.log("error", `Order processing failed: ${errorMessage}`);
    await activities.sendNotification(
      order.customerId,
      "Order Failed",
      `We encountered an issue processing your order ${order.orderId}. Our team will contact you shortly.`
    );

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
export const processOrder = createWorkflow({
  definition: orderProcessingContract.workflows.processOrder,
  contract: orderProcessingContract,
  implementation,
});
