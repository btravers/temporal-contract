import type { InventoryPort } from "../ports/inventory.port.js";

/**
 * Release Inventory Use Case
 *
 * Business logic for releasing reserved inventory
 */
export class ReleaseInventoryUseCase {
  constructor(private readonly inventoryPort: InventoryPort) {}

  async execute(reservationId: string): Promise<void> {
    // Business validation
    if (!reservationId || reservationId.trim() === "") {
      throw new Error("Reservation ID is required");
    }

    // Delegate to inventory port
    return this.inventoryPort.releaseInventory(reservationId);
  }
}
