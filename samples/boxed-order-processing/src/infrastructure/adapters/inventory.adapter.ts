import { Future, Result } from "@swan-io/boxed";
import type { InventoryPort, InventoryError } from "../../domain/ports/inventory.port.js";
import type { InventoryReservation, OrderItem } from "../../domain/entities/order.schema.js";
import { logger } from "../../logger.js";

/**
 * Mock Inventory Adapter
 *
 * Concrete implementation of InventoryPort using Future<Result<T, E>>
 */
export class MockInventoryAdapter implements InventoryPort {
  reserveInventory(items: OrderItem[]): Future<Result<InventoryReservation, InventoryError>> {
    return Future.fromPromise(
      Promise.resolve().then(() => {
        logger.info({ itemCount: items.length }, `📦 Reserving inventory for ${items.length} items`);

        // Simulate inventory check with 95% success rate
        const available = Math.random() > 0.05;

        if (!available) {
          const outOfStockItem = items[0];
          logger.error(`❌ Inventory not available`);
          throw {
            code: "OUT_OF_STOCK",
            message: `Product ${outOfStockItem?.productId} is out of stock`,
            details: { productId: outOfStockItem?.productId },
          };
        }

        const reservationId = `RES${Date.now()}`;
        const result: InventoryReservation = {
          reserved: true,
          reservationId,
        };

        logger.info({ reservationId }, `✅ Inventory reserved: ${reservationId}`);
        return result;
      })
    ).mapError(error => {
      // Convert thrown errors to InventoryError
      if (error && typeof error === 'object' && 'code' in error) {
        return error as InventoryError;
      }
      return {
        code: "RESERVATION_FAILED",
        message: error instanceof Error ? error.message : "Unknown inventory error",
        details: { items },
      };
    });
  }

  releaseInventory(reservationId: string): Future<Result<void, InventoryError>> {
    return Future.fromPromise(
      Promise.resolve().then(() => {
        logger.info({ reservationId }, `🔓 Releasing inventory reservation: ${reservationId}`);
        logger.info(`✅ Inventory released`);
      })
    ).mapError(error => ({
      code: "RELEASE_FAILED",
      message: error instanceof Error ? error.message : "Unknown error",
      details: { reservationId },
    }));
  }
}
