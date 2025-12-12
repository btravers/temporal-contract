import { Future, Result } from "@swan-io/boxed";
import type { InventoryPort, InventoryError } from "../ports/inventory.port.js";
import type { InventoryReservation, OrderItem } from "../entities/order.schema.js";

/**
 * Reserve Inventory Use Case
 *
 * Business logic for reserving inventory
 */
export class ReserveInventoryUseCase {
  constructor(private readonly inventoryPort: InventoryPort) {}

  execute(items: OrderItem[]): Future<Result<InventoryReservation, InventoryError>> {
    // Business validation
    if (!items || items.length === 0) {
      return Future.value(
        Result.Error({
          code: "RESERVATION_FAILED" as const,
          message: "At least one item is required",
          details: { items },
        }),
      );
    }

    for (const item of items) {
      if (item.quantity <= 0) {
        return Future.value(
          Result.Error({
            code: "RESERVATION_FAILED" as const,
            message: `Invalid quantity for product ${item.productId}`,
            details: { productId: item.productId, quantity: item.quantity },
          }),
        );
      }
    }

    // Delegate to inventory port
    return this.inventoryPort.reserveInventory(items);
  }
}
