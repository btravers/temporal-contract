import { contract, workflow, activity } from "@temporal-contract/contract";
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
    })
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

export const boxedOrderContract = contract({
  taskQueue: "boxed-order-processing",
  
  /**
   * Global activities available to all workflows
   */
  activities: {
    /**
     * Log a message with severity level
     */
    log: activity({
      input: z.tuple([z.enum(["info", "warn", "error"]), z.string()]),
      output: z.void(),
    }),

    /**
     * Send notification to customer
     */
    sendNotification: activity({
      input: z.tuple([z.string(), z.string(), z.string()]), // [customerId, subject, message]
      output: z.object({ sent: z.boolean(), messageId: z.string().optional() }),
    }),
  },

  /**
   * Workflows in this contract
   */
  workflows: {
    /**
     * Process an order with explicit error handling using Result pattern
     */
    processOrder: workflow({
      input: z.tuple([OrderSchema]),
      output: OrderResultSchema,

      /**
       * Activities specific to the processOrder workflow
       */
      activities: {
        /**
         * Process payment - can fail with specific error codes
         */
        processPayment: activity({
          input: z.tuple([z.string(), z.number()]), // [customerId, amount]
          output: PaymentResultSchema,
        }),

        /**
         * Reserve inventory - can fail if out of stock
         */
        reserveInventory: activity({
          input: z.tuple([
            z.array(
              z.object({
                productId: z.string(),
                quantity: z.number(),
              })
            ),
          ]),
          output: InventoryResultSchema,
        }),

        /**
         * Release reserved inventory
         */
        releaseInventory: activity({
          input: z.tuple([z.string()]), // [reservationId]
          output: z.void(),
        }),

        /**
         * Create shipment - can fail with carrier issues
         */
        createShipment: activity({
          input: z.tuple([z.string(), z.string()]), // [orderId, customerId]
          output: ShippingResultSchema,
        }),

        /**
         * Refund payment - can fail
         */
        refundPayment: activity({
          input: z.tuple([z.string()]), // [transactionId]
          output: z.object({ refunded: z.boolean(), refundId: z.string().optional() }),
        }),
      },
    }),
  },
});

// Export types for use in implementation
export type Order = z.infer<typeof OrderSchema>;
export type PaymentResult = z.infer<typeof PaymentResultSchema>;
export type InventoryResult = z.infer<typeof InventoryResultSchema>;
export type ShippingResult = z.infer<typeof ShippingResultSchema>;
export type OrderResult = z.infer<typeof OrderResultSchema>;
