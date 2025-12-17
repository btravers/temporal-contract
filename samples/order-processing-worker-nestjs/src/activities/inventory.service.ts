import { Injectable } from "@nestjs/common";
import { ImplementActivity } from "@temporal-contract/worker-nestjs/activity";
import { Future, Result } from "@temporal-contract/boxed";
import { ActivityError } from "@temporal-contract/worker/activity";
import { orderProcessingContract } from "@temporal-contract/sample-order-processing-contract";
import { logger } from "../logger.js";

/**
 * Inventory service implementing inventory-related activities
 */
@Injectable()
export class InventoryService {
  // @ts-expect-error - Workflow-specific activity types not fully inferred
  @ImplementActivity(orderProcessingContract, "reserveInventory" as unknown)
  reserveInventory(items: Array<{ productId: string; quantity: number }>) {
    logger.info({ items }, "Reserving inventory");

    return Future.make<Result<{ reservationId: string; reserved: boolean }, ActivityError>>(
      (resolve) => {
        // Simulate inventory reservation
        setTimeout(() => {
          const reservationId = `rsv-${Date.now()}`;
          logger.info({ reservationId }, "Inventory reserved successfully");
          resolve(Result.Ok({ reservationId, reserved: true }));
        }, 100);
      },
    );
  }

  // @ts-expect-error - Workflow-specific activity types not fully inferred
  @ImplementActivity(orderProcessingContract, "releaseInventory" as unknown)
  releaseInventory(reservationId: string) {
    logger.info({ reservationId }, "Releasing inventory");

    return Future.make<Result<{ released: boolean }, ActivityError>>((resolve) => {
      // Simulate inventory release
      setTimeout(() => {
        logger.info({ reservationId }, "Inventory released successfully");
        resolve(Result.Ok({ released: true }));
      }, 100);
    });
  }
}
