import { Module } from "@nestjs/common";
import { TemporalModule } from "@temporal-contract/worker-nestjs";
import { orderProcessingContract } from "@temporal-contract/sample-order-processing-contract";
import { fileURLToPath } from "node:url";
import { extname } from "node:path";

// Activity services
import { OrderActivitiesService } from "./activities/order.activities.js";
import { GlobalActivitiesService } from "./activities/global.activities.js";

// Domain services
import { PaymentService } from "./domain/payment.service.js";
import { InventoryService } from "./domain/inventory.service.js";
import { ShipmentService } from "./domain/shipment.service.js";
import { NotificationService } from "./domain/notification.service.js";
import { LoggerService } from "./domain/logger.service.js";

/**
 * Helper to resolve workflow path
 */
function workflowPath(filename: string): string {
  return fileURLToPath(new URL(`./${filename}${extname(import.meta.url)}`, import.meta.url));
}

/**
 * Main application module
 *
 * Configures the Temporal worker with NestJS integration:
 * - Uses TemporalModule.forRoot to configure worker
 * - Provides activity services that are automatically discovered
 * - Provides domain services for dependency injection
 */
@Module({
  imports: [
    TemporalModule.forRoot({
      contract: orderProcessingContract,
      connection: {
        address: process.env["TEMPORAL_ADDRESS"] || "localhost:7233",
      },
      workflowsPath: workflowPath("workflows"),
      workerOptions: {
        namespace: "default",
      },
    }),
  ],
  providers: [
    // Activity services (will be automatically discovered by TemporalModule)
    OrderActivitiesService,
    GlobalActivitiesService,

    // Domain services (injected into activity services)
    PaymentService,
    InventoryService,
    ShipmentService,
    NotificationService,
    LoggerService,
  ],
})
export class AppModule {}
