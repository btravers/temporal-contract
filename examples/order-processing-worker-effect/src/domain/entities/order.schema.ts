import type { Schema } from "effect";
import type {
  OrderItemSchema,
  PaymentResultSchema,
  InventoryReservationSchema,
  ShippingResultSchema,
} from "../../contract.js";

export type OrderItem = Schema.Schema.Type<typeof OrderItemSchema>;
export type PaymentResult = Schema.Schema.Type<typeof PaymentResultSchema>;
export type InventoryReservation = Schema.Schema.Type<typeof InventoryReservationSchema>;
export type ShippingResult = Schema.Schema.Type<typeof ShippingResultSchema>;
