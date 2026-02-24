import type { InventoryPort } from "../ports/inventory.port.js";
import type { InventoryReservation, OrderItem } from "../entities/order.schema.js";

export class ReserveInventoryUseCase {
  constructor(private readonly inventoryPort: InventoryPort) {}

  async execute(items: OrderItem[]): Promise<InventoryReservation> {
    if (!items.length) throw new Error("At least one item is required");
    return this.inventoryPort.reserveInventory(items);
  }
}
