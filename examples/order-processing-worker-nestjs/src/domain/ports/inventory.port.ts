import type { InventoryReservation, OrderItem } from "../entities/order.schema.js";

/**
 * Inventory Port - Interface for inventory operations
 */
export type InventoryPort = {
  /**
   * Reserve inventory for order items
   */
  reserveInventory(items: OrderItem[]): Promise<InventoryReservation>;

  /**
   * Release a previously reserved inventory
   */
  releaseInventory(reservationId: string): Promise<void>;
};
