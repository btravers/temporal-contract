import { Future, Result } from "@swan-io/boxed";
import type { InventoryPort, InventoryError } from "../../domain/ports/inventory.port.js";
import type { InventoryReservation, OrderItem } from "../../domain/entities/order.schema.js";
import { pino } from "pino";

const logger = pino({
  transport: {
    target: "pino-pretty",
    options: {
      colorize: true,
      translateTime: "SYS:standard",
      ignore: "pid,hostname",
    },
  },
});

/**
 * Mock Inventory Adapter
 *
 * Concrete implementation of InventoryPort using Future<Result<T, E>>
 */
export class MockInventoryAdapter implements InventoryPort {
  reserveInventory(items: OrderItem[]): Future<Result<InventoryReservation, InventoryError>> {
    return Future.make((resolve) => {
      logger.info({ itemCount: items.length }, `📦 Reserving inventory for ${items.length} items`);

      // Simulate inventory check with 95% success rate
      const available = Math.random() > 0.05;

      if (available) {
        const reservationId = `RES${Date.now()}`;
        const result: InventoryReservation = {
          reserved: true,
          reservationId,
        };

        logger.info({ reservationId }, `✅ Inventory reserved: ${reservationId}`);
        resolve(Result.Ok(result));
      } else {
        const outOfStockItem = items[0];
        logger.error(`❌ Inventory not available`);
        resolve(
          Result.Error({
            code: "OUT_OF_STOCK",
            message: `Product ${outOfStockItem?.productId} is out of stock`,
            details: { productId: outOfStockItem?.productId },
          }),
        );
      }
    });
  }

  releaseInventory(reservationId: string): Future<Result<void, InventoryError>> {
    return Future.make((resolve) => {
      logger.info({ reservationId }, `🔓 Releasing inventory reservation: ${reservationId}`);
      logger.info(`✅ Inventory released`);
      resolve(Result.Ok(undefined));
    });
  }
}
