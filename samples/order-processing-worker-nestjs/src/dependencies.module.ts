import { Module, Global } from "@nestjs/common";

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
      provide: "PaymentAdapter",
      useFactory: () => new MockPaymentAdapter(),
    },
    {
      provide: "LoggerAdapter",
      useFactory: () => new PinoLoggerAdapter(),
    },
    {
      provide: "InventoryAdapter",
      useFactory: () => new MockInventoryAdapter(),
    },
    {
      provide: "ShippingAdapter",
      useFactory: () => new MockShippingAdapter(),
    },
    {
      provide: "NotificationAdapter",
      useFactory: () => new ConsoleNotificationAdapter(),
    },
    // Domain Use Cases
    {
      provide: ProcessPaymentUseCase,
      useFactory: (paymentAdapter: MockPaymentAdapter) => new ProcessPaymentUseCase(paymentAdapter),
      inject: ["PaymentAdapter"],
    },
    {
      provide: ReserveInventoryUseCase,
      useFactory: (inventoryAdapter: MockInventoryAdapter) =>
        new ReserveInventoryUseCase(inventoryAdapter),
      inject: ["InventoryAdapter"],
    },
    {
      provide: ReleaseInventoryUseCase,
      useFactory: (inventoryAdapter: MockInventoryAdapter) =>
        new ReleaseInventoryUseCase(inventoryAdapter),
      inject: ["InventoryAdapter"],
    },
    {
      provide: CreateShipmentUseCase,
      useFactory: (shippingAdapter: MockShippingAdapter) =>
        new CreateShipmentUseCase(shippingAdapter),
      inject: ["ShippingAdapter"],
    },
    {
      provide: SendNotificationUseCase,
      useFactory: (notificationAdapter: ConsoleNotificationAdapter) =>
        new SendNotificationUseCase(notificationAdapter),
      inject: ["NotificationAdapter"],
    },
    {
      provide: RefundPaymentUseCase,
      useFactory: (paymentAdapter: MockPaymentAdapter) => new RefundPaymentUseCase(paymentAdapter),
      inject: ["PaymentAdapter"],
    },
  ],
  exports: [
    "LoggerAdapter",
    ProcessPaymentUseCase,
    ReserveInventoryUseCase,
    ReleaseInventoryUseCase,
    CreateShipmentUseCase,
    SendNotificationUseCase,
    RefundPaymentUseCase,
  ],
})
export class DependenciesModule {}
