import { defineContract } from "@temporal-contract/contract";
import { z } from "zod";
import {
  OrderSchema,
  OrderItemSchema,
  PaymentResultSchema,
  InventoryReservationSchema,
  ShippingResultSchema,
  OrderResultSchema,
} from "../domain/entities/order.schema.js";

/**
 * Order Processing Contract
 *
 * This contract defines a simple order processing system with:
 * - Global activities for logging and notifications
 * - A workflow for processing orders with payment, inventory, and shipping
 *
 * The contract uses domain schemas as the source of truth for business entities.
 */

// ============================================================================
// Contract Definition
// ============================================================================

export const orderProcessingContract = defineContract({
  taskQueue: "order-processing",

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
     * Process an order from payment to shipping
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
      },
    },
  },
});

// Re-export types from domain for convenience
export type {
  Order,
  OrderItem,
  PaymentResult,
  InventoryReservation,
  ShippingResult,
  OrderResult,
} from "../domain/entities/order.schema.js";
