import { declareWorkflow } from "@temporal-contract/worker/workflow";
import { orderProcessingContract } from "@temporal-contract/sample-order-processing-contract";

/**
 * Process Order Workflow Implementation
 *
 * This is the same workflow as in the non-NestJS sample, but it will use
 * activities provided by the NestJS worker which automatically discovers
 * them from the service classes.
 *
 * The workflow code remains unchanged - the only difference is how activities
 * are registered and how dependencies are managed (via NestJS DI).
 */
export const processOrder = declareWorkflow({
  workflowName: "processOrder",
  contract: orderProcessingContract,
  implementation: async (context, order) => {
    const { activities, info } = context;

    // State tracking for rollback
    let paymentTransactionId: string | undefined;
    let reservationId: string | undefined;

    // Step 1: Log order start
    await activities.log({
      level: "info",
      message: `Starting order processing for ${order.orderId} (workflow: ${info.workflowId})`,
    });

    // Step 2: Process payment
    await activities.log({
      level: "info",
      message: `Processing payment of $${order.totalAmount}`,
    });

    const paymentResult = await activities.processPayment({
      customerId: order.customerId,
      amount: order.totalAmount,
    });

    // Check payment result
    if (paymentResult.status === "failed") {
      await activities.log({
        level: "error",
        message: `Payment failed for order ${order.orderId}`,
      });

      await activities.sendNotification({
        customerId: order.customerId,
        subject: "Order Failed",
        message: `We're sorry, but your order ${order.orderId} could not be processed due to payment failure.`,
      });

      return {
        orderId: order.orderId,
        status: "failed" as const,
        failureReason: "Payment processing failed",
        errorCode: "PAYMENT_FAILED",
      };
    }

    paymentTransactionId = paymentResult.transactionId;

    await activities.log({
      level: "info",
      message: `Payment successful: ${paymentTransactionId}`,
    });

    // Step 3: Reserve inventory
    await activities.log({
      level: "info",
      message: `Reserving inventory for ${order.items.length} items`,
    });

    try {
      const reservationResult = await activities.reserveInventory(order.items);

      if (!reservationResult.reserved || !reservationResult.reservationId) {
        throw new Error("Inventory reservation failed");
      }

      reservationId = reservationResult.reservationId;

      await activities.log({
        level: "info",
        message: `Inventory reserved: ${reservationId}`,
      });

      // Step 4: Create shipment
      await activities.log({
        level: "info",
        message: "Creating shipment",
      });

      const shipmentResult = await activities.createShipment({
        orderId: order.orderId,
        customerId: order.customerId,
      });

      await activities.log({
        level: "info",
        message: `Shipment created (tracking: ${shipmentResult.trackingNumber})`,
      });

      // Step 5: Send confirmation
      await activities.sendNotification({
        customerId: order.customerId,
        subject: "Order Confirmed",
        message: `Your order ${order.orderId} has been confirmed and is being processed. Tracking: ${shipmentResult.trackingNumber}`,
      });

      await activities.log({
        level: "info",
        message: `Order ${order.orderId} completed successfully`,
      });

      return {
        orderId: order.orderId,
        status: "completed" as const,
        transactionId: paymentTransactionId,
        trackingNumber: shipmentResult.trackingNumber,
      };
    } catch (error) {
      // Rollback: Release inventory if reserved
      if (reservationId) {
        await activities.log({
          level: "warn",
          message: `Rolling back inventory reservation: ${reservationId}`,
        });
        await activities.releaseInventory(reservationId);
      }

      // Rollback: Refund payment
      if (paymentTransactionId) {
        await activities.log({
          level: "warn",
          message: `Rolling back payment: ${paymentTransactionId}`,
        });
        await activities.refundPayment(paymentTransactionId);
      }

      await activities.log({
        level: "error",
        message: `Order ${order.orderId} failed: ${error instanceof Error ? error.message : String(error)}`,
      });

      // Send failure notification
      await activities.sendNotification({
        customerId: order.customerId,
        subject: "Order Failed",
        message: `We're sorry, but your order ${order.orderId} could not be processed.`,
      });

      return {
        orderId: order.orderId,
        status: "failed" as const,
        transactionId: paymentTransactionId,
        failureReason: error instanceof Error ? error.message : "Unknown error",
        errorCode: "ORDER_PROCESSING_FAILED",
      };
    }
  },
  activityOptions: {
    startToCloseTimeout: "1 minute",
  },
});
