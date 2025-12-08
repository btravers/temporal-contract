import { contract, workflow, activity } from "@temporal-contract/contract";
import { z } from "zod";

/**
 * Order Processing Contract
 * 
 * This contract defines a simple order processing system with:
 * - Global activities for logging and notifications
 * - A workflow for processing orders with payment, inventory, and shipping
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
});

const ShippingResultSchema = z.object({
  trackingNumber: z.string(),
  estimatedDelivery: z.string(),
});

const OrderResultSchema = z.object({
  orderId: z.string(),
  status: z.enum(["completed", "failed"]),
  transactionId: z.string().optional(),
  trackingNumber: z.string().optional(),
  failureReason: z.string().optional(),
});

// ============================================================================
// Contract Definition
// ============================================================================

export const orderProcessingContract = contract({
  taskQueue: "order-processing",
  
  /**
   * Global activities available to all workflows
   */
  activities: {
    /**
     * Log a message to the console
     */
    log: activity({
      input: z.tuple([z.string(), z.string()]), // [level, message]
      output: z.void(),
    }),

    /**
     * Send a notification to a customer
     */
    sendNotification: activity({
      input: z.tuple([z.string(), z.string(), z.string()]), // [customerId, subject, message]
      output: z.void(),
    }),
  },

  /**
   * Workflows in this contract
   */
  workflows: {
    /**
     * Process an order from payment to shipping
     */
    processOrder: workflow({
      input: z.tuple([OrderSchema]),
      output: OrderResultSchema,

      /**
       * Activities specific to the processOrder workflow
       */
      activities: {
        /**
         * Process payment for the order
         */
        processPayment: activity({
          input: z.tuple([z.string(), z.number()]), // [customerId, amount]
          output: PaymentResultSchema,
        }),

        /**
         * Reserve inventory for the order items
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
         * Create a shipment for the order
         */
        createShipment: activity({
          input: z.tuple([z.string(), z.string()]), // [orderId, customerId]
          output: ShippingResultSchema,
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
