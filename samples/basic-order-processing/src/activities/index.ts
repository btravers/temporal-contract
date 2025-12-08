import {
  createActivitiesHandler,
  type RawActivityImplementation,
} from "@temporal-contract/worker";
import { orderProcessingContract } from "../contract.js";
import type {
  PaymentResult,
  InventoryResult,
  ShippingResult,
} from "../contract.js";

// ============================================================================
// Global Activities Implementation
// ============================================================================

const log = async (level: string, message: string): Promise<void> => {
  const timestamp = new Date().toISOString();
  console.log(`[${timestamp}] [${level.toUpperCase()}] ${message}`);
};

const sendNotification = async (customerId: string, subject: string, message: string): Promise<void> => {
  console.log(`📧 Notification to customer ${customerId}`);
  console.log(`   Subject: ${subject}`);
  console.log(`   Message: ${message}`);
  // In a real application, this would send an email or push notification
};

// ============================================================================
// Workflow-Specific Activities Implementation
// ============================================================================

const processPayment = async (customerId: string, amount: number): Promise<PaymentResult> => {
  console.log(`💳 Processing payment of $${amount} for customer ${customerId}`);

  // Simulate payment processing delay
  await new Promise((resolve) => setTimeout(resolve, 1000));

  // Simulate occasional payment failures (10% chance)
  const success = Math.random() > 0.1;

  if (!success) {
    const result: PaymentResult = {
      transactionId: "",
      status: "failed",
      paidAmount: 0,
    };
    console.log(`❌ Payment failed for customer ${customerId}`);
    return result;
  }

  const transactionId = `txn_${Date.now()}_${Math.random().toString(36).substring(7)}`;
  const result: PaymentResult = {
    transactionId,
    status: "success",
    paidAmount: amount,
  };

  console.log(`✅ Payment successful: ${transactionId}`);
  return result;
};

const reserveInventory = async (items: Array<{ productId: string; quantity: number }>): Promise<InventoryResult> => {
  console.log(`📦 Reserving inventory for ${items.length} items`);

  // Simulate inventory check delay
  await new Promise((resolve) => setTimeout(resolve, 500));

  // Simulate occasional out-of-stock scenarios (5% chance)
  const available = Math.random() > 0.05;

  if (!available) {
    console.log(`❌ Inventory not available`);
    const result: InventoryResult = {
      reserved: false,
    };
    return result;
  }

  const reservationId = `res_${Date.now()}_${Math.random().toString(36).substring(7)}`;
  const result: InventoryResult = {
    reserved: true,
    reservationId,
  };

  console.log(`✅ Inventory reserved: ${reservationId}`);
  return result;
};

const releaseInventory = async (reservationId: string): Promise<void> => {
  console.log(`🔓 Releasing inventory reservation: ${reservationId}`);
  await new Promise((resolve) => setTimeout(resolve, 300));
  console.log(`✅ Inventory released`);
};

const createShipment = async (orderId: string, customerId: string): Promise<ShippingResult> => {
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
export const activitiesHandler = createActivitiesHandler({
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
