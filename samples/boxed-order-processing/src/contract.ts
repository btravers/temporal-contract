import { defineContract } from "@temporal-contract/contract";
import { z } from "zod";

/**
 * Boxed Order Processing Contract
 *
 * This contract demonstrates the Result/Future pattern for explicit error handling.
 * Activities return Result<T, E> instead of throwing exceptions.
 */

// ============================================================================
// Schemas
// ============================================================================

const OrderSchema = z.object({
  orderId: z.string(),
  customerId: z.string(),
  items: z.array(
    z.object({
      productId: z.string(),
      quantity: z.number().positive(),
      price: z.number().positive(),
    }),
  ),
  totalAmount: z.number().positive(),
});

const PaymentResultSchema = z.object({
  transactionId: z.string(),
  status: z.enum(["success", "failed"]),
  paidAmount: z.number(),
});

const InventoryResultSchema = z.object({
  reserved: z.boolean(),
  reservationId: z.string().optional(),
  availableQuantity: z.number().optional(),
});

const ShippingResultSchema = z.object({
  trackingNumber: z.string(),
  estimatedDelivery: z.string(),
  carrier: z.string(),
});

const OrderResultSchema = z.object({
  orderId: z.string(),
  status: z.enum(["completed", "failed", "cancelled"]),
  transactionId: z.string().optional(),
  trackingNumber: z.string().optional(),
  failureReason: z.string().optional(),
  errorCode: z.string().optional(),
});

// ============================================================================
// Contract Definition
// ============================================================================

export const boxedOrderContract = defineContract({
  taskQueue: "boxed-order-processing",

  /**
   * Global activities available to all workflows
   */
  activities: {
    /**
     * Log a message to the console
     */
    log: {
      input: z.object({ level: z.string(), message: z.string() }),
      output: z.void(),
    },

    /**
     * Send a notification to a customer
     */
    sendNotification: {
      input: z.object({ customerId: z.string(), subject: z.string(), message: z.string() }),
      output: z.void(),
    },
  },

  /**
   * Workflows in this contract
   */
  workflows: {
    /**
     * Process an order from payment to shipping with Result/Future pattern
     */
    processOrder: {
      input: OrderSchema,
      output: OrderResultSchema,

      /**
       * Activities specific to the processOrder workflow
       */
      activities: {
        /**
         * Process payment for the order
         */
        processPayment: {
          input: z.object({ customerId: z.string(), amount: z.number() }),
          output: PaymentResultSchema,
        },

        /**
         * Reserve inventory for the order items
         */
        reserveInventory: {
          input: z.array(
            z.object({
              productId: z.string(),
              quantity: z.number(),
            }),
          ),
          output: InventoryResultSchema,
        },

        /**
         * Release reserved inventory
         */
        releaseInventory: {
          input: z.string(),
          output: z.void(),
        },

        /**
         * Create a shipment for the order
         */
        createShipment: {
          input: z.object({ orderId: z.string(), customerId: z.string() }),
          output: ShippingResultSchema,
        },

        /**
         * Refund a payment (used in case of errors)
         */
        refundPayment: {
          input: z.string(),
          output: z.void(),
        },
      },
    },
  },
});

// Export types for use in implementation
export type Order = z.infer<typeof OrderSchema>;
export type PaymentResult = z.infer<typeof PaymentResultSchema>;
export type InventoryResult = z.infer<typeof InventoryResultSchema>;
export type ShippingResult = z.infer<typeof ShippingResultSchema>;
export type OrderResult = z.infer<typeof OrderResultSchema>;
