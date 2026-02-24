import type { InventoryReservation, OrderItem } from "../entities/order.schema.js";

export type InventoryPort = {
  reserveInventory(items: OrderItem[]): Promise<InventoryReservation>;
  releaseInventory(reservationId: string): Promise<void>;
};
