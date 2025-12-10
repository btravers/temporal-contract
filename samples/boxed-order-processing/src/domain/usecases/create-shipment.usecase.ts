import { Future, Result } from "@swan-io/boxed";
import type { ShippingPort, ShippingError } from "../ports/shipping.port.js";
import type { ShippingResult } from "../entities/order.schema.js";

/**
 * Create Shipment Use Case
 *
 * Business logic for creating shipments
 */
export class CreateShipmentUseCase {
  constructor(private readonly shippingPort: ShippingPort) {}

  execute(orderId: string, customerId: string): Future<Result<ShippingResult, ShippingError>> {
    // Business validation
    if (!orderId || orderId.trim() === "") {
      return Future.value(
        Result.Error({
          code: "SHIPMENT_FAILED" as const,
          message: "Order ID is required",
          details: { orderId },
        }),
      );
    }

    if (!customerId || customerId.trim() === "") {
      return Future.value(
        Result.Error({
          code: "SHIPMENT_FAILED" as const,
          message: "Customer ID is required",
          details: { customerId },
        }),
      );
    }

    // Delegate to shipping port
    return this.shippingPort.createShipment(orderId, customerId);
  }
}
