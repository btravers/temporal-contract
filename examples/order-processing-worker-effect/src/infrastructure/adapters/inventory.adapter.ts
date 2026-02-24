import type { InventoryPort } from "../../domain/ports/inventory.port.js";
import type { InventoryReservation, OrderItem } from "../../domain/entities/order.schema.js";
import { logger } from "../../logger.js";

export class MockInventoryAdapter implements InventoryPort {
  async reserveInventory(items: OrderItem[]): Promise<InventoryReservation> {
    logger.info({ itemCount: items.length }, `📦 Reserving inventory`);
    const reservationId = `RES${Date.now()}`;
    logger.info({ reservationId }, `✅ Inventory reserved`);
    return { reserved: true, reservationId };
  }

  async releaseInventory(reservationId: string): Promise<void> {
    logger.info({ reservationId }, `🔓 Releasing inventory`);
    logger.info(`✅ Inventory released`);
  }
}
