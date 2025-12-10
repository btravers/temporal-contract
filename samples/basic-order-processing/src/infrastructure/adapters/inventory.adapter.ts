import type { InventoryPort } from "../../domain/ports/inventory.port.js";
import type { InventoryReservation, OrderItem } from "../../domain/entities/order.schema.js";
import { pino } from "pino";

const logger = pino();

/**
 * Mock Inventory Adapter
 *
 * Concrete implementation of InventoryPort for testing/demo purposes
 */
export class MockInventoryAdapter implements InventoryPort {
  async reserveInventory(items: OrderItem[]): Promise<InventoryReservation> {
    logger.info({ itemCount: items.length }, `📦 Reserving inventory for ${items.length} items`);

    // Simulate inventory reservation
    // In real implementation, this would check stock levels and reserve items
    const reservationId = `RES${Date.now()}`;

    const result = {
      reserved: true,
      reservationId,
    };

    logger.info({ reservationId }, `✅ Inventory reserved: ${reservationId}`);
    return result;
  }

  async releaseInventory(reservationId: string): Promise<void> {
    logger.info({ reservationId }, `🔓 Releasing inventory reservation: ${reservationId}`);
    // Simulate inventory release
    // In real implementation, this would release the reserved items
    logger.info(`✅ Inventory released`);
  }
}
