import { z } from "zod";

/**
 * Domain Schemas - Source of truth for business entities
 */

export const OrderItemSchema = z.object({
  productId: z.string(),
  quantity: z.number().positive(),
  price: z.number().positive(),
});

export const OrderSchema = z.object({
  orderId: z.string(),
  customerId: z.string(),
  items: z.array(OrderItemSchema),
  totalAmount: z.number().positive(),
});

export const PaymentResultSchema = z.discriminatedUnion("status", [
  z.object({
    status: z.literal("success"),
    transactionId: z.string(),
    paidAmount: z.number(),
  }),
  z.object({
    status: z.literal("failed"),
  }),
]);

export const InventoryReservationSchema = z.object({
  reserved: z.boolean(),
  reservationId: z.string().optional(),
});

export const ShippingResultSchema = z.object({
  trackingNumber: z.string(),
  estimatedDelivery: z.string(),
});

export const OrderResultSchema = z.object({
  orderId: z.string(),
  status: z.enum(["completed", "failed"]),
  transactionId: z.string().optional(),
  trackingNumber: z.string().optional(),
  failureReason: z.string().optional(),
  errorCode: z.string().optional(),
});
