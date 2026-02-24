import type { ShippingPort } from "../ports/shipping.port.js";
import type { ShippingResult } from "../entities/order.schema.js";

export class CreateShipmentUseCase {
  constructor(private readonly shippingPort: ShippingPort) {}

  async execute(orderId: string, customerId: string): Promise<ShippingResult> {
    if (!orderId.trim()) throw new Error("Order ID is required");
    if (!customerId.trim()) throw new Error("Customer ID is required");
    return this.shippingPort.createShipment(orderId, customerId);
  }
}
