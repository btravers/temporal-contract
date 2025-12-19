import { Module, Global } from "@nestjs/common";

// Provider tokens as symbols
export const PAYMENT_ADAPTER = Symbol("PaymentAdapter");
export const LOGGER_ADAPTER = Symbol("LoggerAdapter");
export const INVENTORY_ADAPTER = Symbol("InventoryAdapter");
export const SHIPPING_ADAPTER = Symbol("ShippingAdapter");
export const NOTIFICATION_ADAPTER = Symbol("NotificationAdapter");

// Domain
import { ProcessPaymentUseCase } from "./domain/usecases/process-payment.usecase.js";
import { ReserveInventoryUseCase } from "./domain/usecases/reserve-inventory.usecase.js";
import { ReleaseInventoryUseCase } from "./domain/usecases/release-inventory.usecase.js";
import { CreateShipmentUseCase } from "./domain/usecases/create-shipment.usecase.js";
import { SendNotificationUseCase } from "./domain/usecases/send-notification.usecase.js";
import { RefundPaymentUseCase } from "./domain/usecases/refund-payment.usecase.js";

// Infrastructure
import { MockPaymentAdapter } from "./infrastructure/adapters/payment.adapter.js";
import { MockInventoryAdapter } from "./infrastructure/adapters/inventory.adapter.js";
import { MockShippingAdapter } from "./infrastructure/adapters/shipping.adapter.js";
import { ConsoleNotificationAdapter } from "./infrastructure/adapters/notification.adapter.js";
import { PinoLoggerAdapter } from "./infrastructure/adapters/logger.adapter.js";

/**
 * Global module providing all domain and infrastructure services
 * This makes all services available to activities via dependency injection
 */
@Global()
@Module({
  providers: [
    // Infrastructure Adapters
    {
      provide: PAYMENT_ADAPTER,
      useFactory: () => new MockPaymentAdapter(),
    },
    {
      provide: LOGGER_ADAPTER,
      useFactory: () => new PinoLoggerAdapter(),
    },
    {
      provide: INVENTORY_ADAPTER,
      useFactory: () => new MockInventoryAdapter(),
    },
    {
      provide: SHIPPING_ADAPTER,
      useFactory: () => new MockShippingAdapter(),
    },
    {
      provide: NOTIFICATION_ADAPTER,
      useFactory: () => new ConsoleNotificationAdapter(),
    },
    // Domain Use Cases
    {
      provide: ProcessPaymentUseCase,
      useFactory: (paymentAdapter: MockPaymentAdapter) => new ProcessPaymentUseCase(paymentAdapter),
      inject: [PAYMENT_ADAPTER],
    },
    {
      provide: ReserveInventoryUseCase,
      useFactory: (inventoryAdapter: MockInventoryAdapter) =>
        new ReserveInventoryUseCase(inventoryAdapter),
      inject: [INVENTORY_ADAPTER],
    },
    {
      provide: ReleaseInventoryUseCase,
      useFactory: (inventoryAdapter: MockInventoryAdapter) =>
        new ReleaseInventoryUseCase(inventoryAdapter),
      inject: [INVENTORY_ADAPTER],
    },
    {
      provide: CreateShipmentUseCase,
      useFactory: (shippingAdapter: MockShippingAdapter) =>
        new CreateShipmentUseCase(shippingAdapter),
      inject: [SHIPPING_ADAPTER],
    },
    {
      provide: SendNotificationUseCase,
      useFactory: (notificationAdapter: ConsoleNotificationAdapter) =>
        new SendNotificationUseCase(notificationAdapter),
      inject: [NOTIFICATION_ADAPTER],
    },
    {
      provide: RefundPaymentUseCase,
      useFactory: (paymentAdapter: MockPaymentAdapter) => new RefundPaymentUseCase(paymentAdapter),
      inject: [PAYMENT_ADAPTER],
    },
  ],
  exports: [
    PAYMENT_ADAPTER,
    LOGGER_ADAPTER,
    ProcessPaymentUseCase,
    ReserveInventoryUseCase,
    ReleaseInventoryUseCase,
    CreateShipmentUseCase,
    SendNotificationUseCase,
    RefundPaymentUseCase,
  ],
})
export class DependenciesModule {}
