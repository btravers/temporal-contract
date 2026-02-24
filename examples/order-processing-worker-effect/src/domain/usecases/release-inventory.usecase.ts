import type { InventoryPort } from "../ports/inventory.port.js";

export class ReleaseInventoryUseCase {
  constructor(private readonly inventoryPort: InventoryPort) {}

  async execute(reservationId: string): Promise<void> {
    if (!reservationId.trim()) throw new Error("Reservation ID is required");
    return this.inventoryPort.releaseInventory(reservationId);
  }
}
