import { ProcessPaymentUseCase } from "./domain/usecases/process-payment.usecase.js";
import { ReserveInventoryUseCase } from "./domain/usecases/reserve-inventory.usecase.js";
import { ReleaseInventoryUseCase } from "./domain/usecases/release-inventory.usecase.js";
import { CreateShipmentUseCase } from "./domain/usecases/create-shipment.usecase.js";
import { SendNotificationUseCase } from "./domain/usecases/send-notification.usecase.js";
import { RefundPaymentUseCase } from "./domain/usecases/refund-payment.usecase.js";

import { MockPaymentAdapter } from "./infrastructure/adapters/payment.adapter.js";
import { MockInventoryAdapter } from "./infrastructure/adapters/inventory.adapter.js";
import { MockShippingAdapter } from "./infrastructure/adapters/shipping.adapter.js";
import { ConsoleNotificationAdapter } from "./infrastructure/adapters/notification.adapter.js";

export const paymentAdapter = new MockPaymentAdapter();
const inventoryAdapter = new MockInventoryAdapter();
const shippingAdapter = new MockShippingAdapter();
const notificationAdapter = new ConsoleNotificationAdapter();

export const processPaymentUseCase = new ProcessPaymentUseCase(paymentAdapter);
export const reserveInventoryUseCase = new ReserveInventoryUseCase(inventoryAdapter);
export const releaseInventoryUseCase = new ReleaseInventoryUseCase(inventoryAdapter);
export const createShipmentUseCase = new CreateShipmentUseCase(shippingAdapter);
export const sendNotificationUseCase = new SendNotificationUseCase(notificationAdapter);
export const refundPaymentUseCase = new RefundPaymentUseCase(paymentAdapter);
