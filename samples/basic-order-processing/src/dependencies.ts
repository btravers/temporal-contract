/**
 * Dependency Injection Container
 * Centralizes the instantiation and wiring of all domain and infrastructure components
 */

// Domain
import { ProcessPaymentUseCase } from "./domain/usecases/process-payment.usecase.js";
import { ReserveInventoryUseCase } from "./domain/usecases/reserve-inventory.usecase.js";
import { ReleaseInventoryUseCase } from "./domain/usecases/release-inventory.usecase.js";
import { CreateShipmentUseCase } from "./domain/usecases/create-shipment.usecase.js";
import { SendNotificationUseCase } from "./domain/usecases/send-notification.usecase.js";

// Infrastructure
import { MockPaymentAdapter } from "./infrastructure/adapters/payment.adapter.js";
import { MockInventoryAdapter } from "./infrastructure/adapters/inventory.adapter.js";
import { MockShippingAdapter } from "./infrastructure/adapters/shipping.adapter.js";
import { ConsoleNotificationAdapter } from "./infrastructure/adapters/notification.adapter.js";
import { PinoLoggerAdapter } from "./infrastructure/adapters/logger.adapter.js";

// ============================================================================
// Adapters
// ============================================================================

export const paymentAdapter = new MockPaymentAdapter();
export const loggerAdapter = new PinoLoggerAdapter();
const inventoryAdapter = new MockInventoryAdapter();
const shippingAdapter = new MockShippingAdapter();
const notificationAdapter = new ConsoleNotificationAdapter();

// ============================================================================
// Use Cases
// ============================================================================

export const processPaymentUseCase = new ProcessPaymentUseCase(paymentAdapter);
export const reserveInventoryUseCase = new ReserveInventoryUseCase(inventoryAdapter);
export const releaseInventoryUseCase = new ReleaseInventoryUseCase(inventoryAdapter);
export const createShipmentUseCase = new CreateShipmentUseCase(shippingAdapter);
export const sendNotificationUseCase = new SendNotificationUseCase(notificationAdapter);
