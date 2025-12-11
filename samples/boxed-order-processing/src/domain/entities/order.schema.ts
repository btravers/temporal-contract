/**
 * Domain Schemas - Re-exported from contract package
 *
 * These schemas are now defined in the contract package and re-exported here
 * for use within the worker implementation.
 */

export {
  OrderItemSchema,
  OrderSchema,
  PaymentResultSchema,
  InventoryReservationSchema,
  ShippingResultSchema,
  OrderResultSchema,
  type OrderItem,
  type Order,
  type PaymentResult,
  type InventoryReservation,
  type ShippingResult,
  type OrderResult,
} from "@temporal-contract/sample-boxed-order-processing-contract";
