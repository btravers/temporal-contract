/**
 * Domain Entity Types - Inferred from contract package schemas
 *
 * These types are inferred locally for use within the worker implementation.
 * The schemas themselves are defined in the contract package.
 */

import type { z } from "zod";
import {
  OrderItemSchema,
  PaymentResultSchema,
  InventoryReservationSchema,
  ShippingResultSchema,
} from "@temporal-contract/sample-order-processing-contract";

export type OrderItem = z.infer<typeof OrderItemSchema>;
export type PaymentResult = z.infer<typeof PaymentResultSchema>;
export type InventoryReservation = z.infer<typeof InventoryReservationSchema>;
export type ShippingResult = z.infer<typeof ShippingResultSchema>;
