import type { ShippingPort } from "../../domain/ports/shipping.port.js";
import type { ShippingResult } from "../../domain/entities/order.schema.js";
import { logger } from "../../logger.js";

export class MockShippingAdapter implements ShippingPort {
  async createShipment(orderId: string, _customerId: string): Promise<ShippingResult> {
    logger.info({ orderId }, `📮 Creating shipment`);
    const trackingNumber = `TRACK${Date.now()}${Math.random().toString(36).substring(2, 8).toUpperCase()}`;
    const estimatedDelivery = new Date(Date.now() + 3 * 24 * 60 * 60 * 1000).toISOString();
    logger.info({ trackingNumber }, `✅ Shipment created`);
    return { trackingNumber, estimatedDelivery };
  }
}
