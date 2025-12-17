import { createActivitiesModule } from "@temporal-contract/worker-nestjs/activity";
import { orderProcessingContract } from "@temporal-contract/sample-order-processing-contract";
import { PaymentService } from "./payment.service.js";
import { InventoryService } from "./inventory.service.js";
import { NotificationService } from "./notification.service.js";
import { ShippingService } from "./shipping.service.js";

/**
 * NestJS module for order processing activities
 */
export const ActivitiesModule = createActivitiesModule({
  contract: orderProcessingContract,
  providers: [PaymentService, InventoryService, NotificationService, ShippingService],
});
