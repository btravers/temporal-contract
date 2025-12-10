import type { Future, Result } from "@swan-io/boxed";
import type { ShippingResult } from "../entities/order.schema.js";

export type ShippingError = {
  code: "SHIPMENT_FAILED" | "CARRIER_UNAVAILABLE" | "INVALID_ADDRESS";
  message: string;
  details?: Record<string, unknown>;
};

/**
 * Shipping Port - Interface for shipping operations
 */
export interface ShippingPort {
  /**
   * Create a shipment for an order
   */
  createShipment(
    orderId: string,
    customerId: string,
  ): Future<Result<ShippingResult, ShippingError>>;
}
