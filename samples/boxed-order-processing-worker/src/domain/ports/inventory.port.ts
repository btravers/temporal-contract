import type { Future, Result } from "@swan-io/boxed";
import type { InventoryReservation, OrderItem } from "../entities/order.schema.js";

export type InventoryError = {
  code: "OUT_OF_STOCK" | "INVALID_RESERVATION" | "RESERVATION_FAILED";
  message: string;
  details?: Record<string, unknown>;
};

/**
 * Inventory Port - Interface for inventory operations
 */
export interface InventoryPort {
  /**
   * Reserve inventory for order items
   */
  reserveInventory(items: OrderItem[]): Future<Result<InventoryReservation, InventoryError>>;

  /**
   * Release a previously reserved inventory
   */
  releaseInventory(reservationId: string): Future<Result<void, InventoryError>>;
}
