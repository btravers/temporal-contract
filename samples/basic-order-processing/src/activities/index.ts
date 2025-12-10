import { declareActivitiesHandler } from "@temporal-contract/worker";
import type { ActivityHandler, WorkflowActivityHandler } from "@temporal-contract/contract";
import { orderProcessingContract } from "../contract.js";

// Domain
import { ProcessPaymentUseCase } from "../domain/usecases/process-payment.usecase.js";
import { ReserveInventoryUseCase } from "../domain/usecases/reserve-inventory.usecase.js";
import { ReleaseInventoryUseCase } from "../domain/usecases/release-inventory.usecase.js";
import { CreateShipmentUseCase } from "../domain/usecases/create-shipment.usecase.js";
import { SendNotificationUseCase } from "../domain/usecases/send-notification.usecase.js";

// Infrastructure
import { MockPaymentAdapter } from "../infrastructure/adapters/payment.adapter.js";
import { MockInventoryAdapter } from "../infrastructure/adapters/inventory.adapter.js";
import { MockShippingAdapter } from "../infrastructure/adapters/shipping.adapter.js";
import { ConsoleNotificationAdapter } from "../infrastructure/adapters/notification.adapter.js";
import { PinoLoggerAdapter } from "../infrastructure/adapters/logger.adapter.js";

// ============================================================================
// Dependency Injection - Create adapters and use cases
// ============================================================================

// Adapters
const paymentAdapter = new MockPaymentAdapter();
const inventoryAdapter = new MockInventoryAdapter();
const shippingAdapter = new MockShippingAdapter();
const notificationAdapter = new ConsoleNotificationAdapter();
const loggerAdapter = new PinoLoggerAdapter();

// Use Cases
const processPaymentUseCase = new ProcessPaymentUseCase(paymentAdapter);
const reserveInventoryUseCase = new ReserveInventoryUseCase(inventoryAdapter);
const releaseInventoryUseCase = new ReleaseInventoryUseCase(inventoryAdapter);
const createShipmentUseCase = new CreateShipmentUseCase(shippingAdapter);
const sendNotificationUseCase = new SendNotificationUseCase(notificationAdapter);

// ============================================================================
// Global Activities Implementation
// ============================================================================

/**
 * Log activity - delegates to logger adapter
 */
const log: ActivityHandler<typeof orderProcessingContract, "log"> = async ({ level, message }) => {
  loggerAdapter.log(level, message);
};

/**
 * Send notification activity - delegates to use case
 */
const sendNotification: ActivityHandler<
  typeof orderProcessingContract,
  "sendNotification"
> = async ({ customerId, subject, message }) => {
  await sendNotificationUseCase.execute(customerId, subject, message);
};

// ============================================================================
// Workflow-Specific Activities Implementation
// ============================================================================

/**
 * Process payment activity - delegates to use case
 */
const processPayment: WorkflowActivityHandler<
  typeof orderProcessingContract,
  "processOrder",
  "processPayment"
> = async ({ customerId, amount }) => {
  return processPaymentUseCase.execute(customerId, amount);
};

/**
 * Reserve inventory activity - delegates to use case
 */
const reserveInventory: WorkflowActivityHandler<
  typeof orderProcessingContract,
  "processOrder",
  "reserveInventory"
> = async (items) => {
  return reserveInventoryUseCase.execute(items);
};

/**
 * Release inventory activity - delegates to use case
 */
const releaseInventory: WorkflowActivityHandler<
  typeof orderProcessingContract,
  "processOrder",
  "releaseInventory"
> = async (reservationId) => {
  await releaseInventoryUseCase.execute(reservationId);
};

/**
 * Create shipment activity - delegates to use case
 */
const createShipment: WorkflowActivityHandler<
  typeof orderProcessingContract,
  "processOrder",
  "createShipment"
> = async ({ orderId, customerId }) => {
  return createShipmentUseCase.execute(orderId, customerId);
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
