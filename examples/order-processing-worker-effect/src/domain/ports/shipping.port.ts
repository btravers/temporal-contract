import type { ShippingResult } from "../entities/order.schema.js";

export type ShippingPort = {
  createShipment(orderId: string, customerId: string): Promise<ShippingResult>;
};
