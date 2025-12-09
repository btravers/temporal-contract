import { declareActivitiesHandler } from "@temporal-contract/worker";
import { orderProcessingContract } from "../contract.js";
import type { InventoryResult, PaymentResult, ShippingResult } from "../contract.js";

// ============================================================================
// Global Activities Implementation
// ============================================================================

const log = async ({ level, message }: { level: string; message: string }): Promise<void> => {
  const timestamp = new Date().toISOString();
  console.log(`[${timestamp}] [${level.toUpperCase()}] ${message}`);
};

const sendNotification = async ({
  customerId,
  subject,
  message,
}: {
  customerId: string;
  subject: string;
  message: string;
}): Promise<void> => {
  console.log(`\uD83D\uDCE7 Sending notification to ${customerId}`);
  console.log(`   Subject: ${subject}`);
  console.log(`   Message: ${message}`);
  // Simulate API call delay
  await new Promise((resolve) => setTimeout(resolve, 500));
  console.log(`\u2705 Notification sent to ${customerId}`);
};

// ============================================================================
// Workflow-Specific Activities Implementation
// ============================================================================

const processPayment = async ({
  customerId,
  amount,
}: {
  customerId: string;
  amount: number;
}): Promise<PaymentResult> => {
  console.log(`\uD83D\uDCB3 Processing payment of $${amount} for customer ${customerId}`);

  // Simulate payment processing delay
  await new Promise((resolve) => setTimeout(resolve, 1000));

  // Simulate random payment failure (10% chance)
  const success = Math.random() > 0.1;

  const result: PaymentResult = {
    transactionId: `TXN${Date.now()}`,
    status: success ? "success" : "failed",
    paidAmount: success ? amount : 0,
  };

  if (success) {
    console.log(`\u2705 Payment processed: ${result.transactionId}`);
  } else {
    console.log(`\u274C Payment failed`);
  }

  return result;
};

const reserveInventory = async (
  items: Array<{ productId: string; quantity: number }>,
): Promise<InventoryResult> => {
  console.log(`\uD83D\uDCE6 Reserving inventory for ${items.length} items`);

  // Simulate inventory check delay
  await new Promise((resolve) => setTimeout(resolve, 600));

  // All items available
  const reservationId = `RES${Date.now()}`;
  const result: InventoryResult = {
    reserved: true,
    reservationId,
  };

  console.log(`\u2705 Inventory reserved: ${reservationId}`);
  return result;
};

const releaseInventory = async (reservationId: string): Promise<void> => {
  console.log(`\uD83D\uDD13 Releasing inventory reservation: ${reservationId}`);
  await new Promise((resolve) => setTimeout(resolve, 300));
  console.log(`\u2705 Inventory released`);
};

const createShipment = async ({
  orderId,
  customerId: _customerId,
}: {
  orderId: string;
  customerId: string;
}): Promise<ShippingResult> => {
  console.log(`📮 Creating shipment for order ${orderId}`);

  // Simulate shipment creation delay
  await new Promise((resolve) => setTimeout(resolve, 800));

  const trackingNumber = `TRACK${Date.now()}${Math.random().toString(36).substring(2, 8).toUpperCase()}`;
  const estimatedDelivery = new Date(Date.now() + 3 * 24 * 60 * 60 * 1000).toISOString();

  const result: ShippingResult = {
    trackingNumber,
    estimatedDelivery,
  };

  console.log(`✅ Shipment created: ${trackingNumber}`);
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
