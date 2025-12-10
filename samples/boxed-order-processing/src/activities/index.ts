import { Future, Result } from "@swan-io/boxed";
import { declareActivitiesHandler } from "@temporal-contract/worker-boxed";
import type {
  BoxedActivityHandler,
  BoxedWorkflowActivityHandler,
} from "@temporal-contract/worker-boxed";
import { boxedOrderContract } from "../contract.js";

// Domain
import { ProcessPaymentUseCase } from "../domain/usecases/process-payment.usecase.js";
import { ReserveInventoryUseCase } from "../domain/usecases/reserve-inventory.usecase.js";
import { ReleaseInventoryUseCase } from "../domain/usecases/release-inventory.usecase.js";
import { CreateShipmentUseCase } from "../domain/usecases/create-shipment.usecase.js";
import { SendNotificationUseCase } from "../domain/usecases/send-notification.usecase.js";
import { RefundPaymentUseCase } from "../domain/usecases/refund-payment.usecase.js";

// Infrastructure
import { MockPaymentAdapter } from "../infrastructure/adapters/payment.adapter.js";
import { MockInventoryAdapter } from "../infrastructure/adapters/inventory.adapter.js";
import { MockShippingAdapter } from "../infrastructure/adapters/shipping.adapter.js";
import { ConsoleNotificationAdapter } from "../infrastructure/adapters/notification.adapter.js";
import { PinoLoggerAdapter } from "../infrastructure/adapters/logger.adapter.js";

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
const refundPaymentUseCase = new RefundPaymentUseCase(paymentAdapter);

// ============================================================================
// Global Activities
// ============================================================================

/**
 * Log activity - delegates to logger adapter
 */
const log: BoxedActivityHandler<typeof boxedOrderContract, "log"> = ({ level, message }) => {
  return Future.make((resolve) => {
    loggerAdapter.log(level, message);
    resolve(Result.Ok(undefined));
  });
};

/**
 * Send notification activity - delegates to use case
 */
const sendNotification: BoxedActivityHandler<typeof boxedOrderContract, "sendNotification"> = ({
  customerId,
  subject,
  message,
}) => {
  return sendNotificationUseCase.execute(customerId, subject, message);
};

// ============================================================================
// Workflow-Specific Activities
// ============================================================================

/**
 * Process payment activity - delegates to use case
 */
const processPayment: BoxedWorkflowActivityHandler<
  typeof boxedOrderContract,
  "processOrder",
  "processPayment"
> = ({ customerId, amount }) => {
  return processPaymentUseCase.execute(customerId, amount);
};

/**
 * Reserve inventory activity - delegates to use case
 */
const reserveInventory: BoxedWorkflowActivityHandler<
  typeof boxedOrderContract,
  "processOrder",
  "reserveInventory"
> = (items) => {
  return reserveInventoryUseCase.execute(items);
};

/**
 * Release inventory activity - delegates to use case
 */
const releaseInventory: BoxedWorkflowActivityHandler<
  typeof boxedOrderContract,
  "processOrder",
  "releaseInventory"
> = (reservationId) => {
  return releaseInventoryUseCase.execute(reservationId);
};

/**
 * Create shipment activity - delegates to use case
 */
const createShipment: BoxedWorkflowActivityHandler<
  typeof boxedOrderContract,
  "processOrder",
  "createShipment"
> = ({ orderId, customerId }) => {
  return createShipmentUseCase.execute(orderId, customerId);
};

/**
 * Refund payment activity - delegates to use case
 */
const refundPayment: BoxedWorkflowActivityHandler<
  typeof boxedOrderContract,
  "processOrder",
  "refundPayment"
> = (transactionId) => {
  return refundPaymentUseCase.execute(transactionId);
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
