import { Future, Result } from "@swan-io/boxed";
import type { InventoryPort, InventoryError } from "../ports/inventory.port.js";

/**
 * Release Inventory Use Case
 *
 * Business logic for releasing reserved inventory
 */
export class ReleaseInventoryUseCase {
  constructor(private readonly inventoryPort: InventoryPort) {}

  execute(reservationId: string): Future<Result<void, InventoryError>> {
    // Business validation
    if (!reservationId || reservationId.trim() === "") {
      return Future.value(
        Result.Error({
          code: "INVALID_RESERVATION" as const,
          message: "Reservation ID is required",
          details: { reservationId },
        }),
      );
    }

    // Delegate to inventory port
    return this.inventoryPort.releaseInventory(reservationId);
  }
}
