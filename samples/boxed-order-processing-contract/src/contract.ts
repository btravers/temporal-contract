import { defineContract } from "@temporal-contract/contract";
import { z } from "zod";
import {
  OrderSchema,
  OrderItemSchema,
  PaymentResultSchema,
  InventoryReservationSchema,
  ShippingResultSchema,
  OrderResultSchema,
} from "./schemas.js";

/**
 * Boxed Order Processing Contract
 *
 * This contract demonstrates the Result/Future pattern for explicit error handling.
 * Activities return Result<T, E> instead of throwing exceptions.
 *
 * The contract uses domain schemas as the source of truth for business entities.
 */

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
      input: z.object({
        level: z.enum(["fatal", "error", "warn", "info", "debug", "trace"]),
        message: z.string(),
      }),
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
          input: z.array(OrderItemSchema),
          output: InventoryReservationSchema,
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
