import { Injectable } from "@nestjs/common";
import { ImplementActivity } from "@temporal-contract/worker-nestjs/activity";
import { Future, Result } from "@temporal-contract/boxed";
import { ActivityError } from "@temporal-contract/worker/activity";
import { orderProcessingContract } from "@temporal-contract/sample-order-processing-contract";
import { logger } from "../logger.js";

/**
 * Shipping service implementing shipping-related activities
 */
@Injectable()
export class ShippingService {
  // @ts-expect-error - Workflow-specific activity types not fully inferred
  @ImplementActivity(orderProcessingContract, "createShipment" as unknown)
  createShipment(args: { orderId: string; customerId: string }) {
    logger.info({ orderId: args.orderId, customerId: args.customerId }, "Creating shipment");

    return Future.make<Result<{ trackingNumber: string; shipped: boolean }, ActivityError>>(
      (resolve) => {
        // Simulate shipment creation
        setTimeout(() => {
          const trackingNumber = `TRK-${Date.now()}`;
          logger.info({ trackingNumber }, "Shipment created successfully");
          resolve(Result.Ok({ trackingNumber, shipped: true }));
        }, 100);
      },
    );
  }
}
