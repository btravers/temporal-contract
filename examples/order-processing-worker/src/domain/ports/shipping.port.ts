import type { ShippingResult } from "../entities/order.schema.js";

/**
 * Shipping Port - Interface for shipping operations
 */
export interface ShippingPort {
  /**
   * Create a shipment for an order
   */
  createShipment(orderId: string, customerId: string): Promise<ShippingResult>;
}
