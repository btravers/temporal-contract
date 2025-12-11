import { Connection } from "@temporalio/client";
import { TypedClient } from "@temporal-contract/client";
import {
  orderProcessingContract,
  OrderSchema,
} from "@temporal-contract/sample-basic-order-processing-contract";
import type { z } from "zod";
import { logger } from "./logger.js";

type Order = z.infer<typeof OrderSchema>;

/**
 * Client for Boxed Order Processing Worker
 *
 * This client demonstrates how to interact with the boxed worker
 * implementation of the unified order processing contract.
 *
 * Note: From the client perspective, both basic and boxed workers
 * look identical - they implement the same contract. The difference
 * is only in how they handle errors internally.
 *
 * Usage:
 *   1. Start Temporal server: temporal server start-dev
 *   2. Start boxed worker: cd samples/boxed-order-processing && pnpm dev:worker
 *   3. Run this client: cd samples/order-processing-client && pnpm dev:boxed
 */
async function run() {
  logger.info("🚀 Starting Order Processing Client (Boxed Worker)...");

  // Connect to Temporal server
  const connection = await Connection.connect({
    address: "localhost:7233",
  });

  // Create type-safe client for our contract
  // Note: Same contract as basic worker!
  const contractClient = TypedClient.create(orderProcessingContract, {
    connection,
    namespace: "default",
  });

  // Example orders to process
  const orders: Order[] = [
    {
      orderId: `ORD-BOXED-${Date.now()}-001`,
      customerId: "CUST-789",
      items: [
        {
          productId: "PROD-A",
          quantity: 2,
          price: 29.99,
        },
        {
          productId: "PROD-B",
          quantity: 1,
          price: 49.99,
        },
      ],
      totalAmount: 109.97,
    },
    {
      orderId: `ORD-BOXED-${Date.now()}-002`,
      customerId: "CUST-012",
      items: [
        {
          productId: "PROD-C",
          quantity: 3,
          price: 19.99,
        },
      ],
      totalAmount: 59.97,
    },
    {
      orderId: `ORD-BOXED-${Date.now()}-003`,
      customerId: "CUST-345",
      items: [
        {
          productId: "PROD-D",
          quantity: 1,
          price: 199.99,
        },
        {
          productId: "PROD-E",
          quantity: 2,
          price: 39.99,
        },
      ],
      totalAmount: 279.97,
    },
  ];

  logger.info("📦 Processing orders with boxed worker implementation...");

  for (const order of orders) {
    try {
      logger.info({ order }, `📦 Creating order: ${order.orderId}`);

      // Start the workflow
      const handle = await contractClient.startWorkflow("processOrder", {
        workflowId: order.orderId,
        args: order,
      });

      logger.info({ workflowId: handle.workflowId }, `✅ Workflow started: ${handle.workflowId}`);

      logger.info("⌛ Waiting for workflow result...");

      // Wait for the result (fully typed)
      const result = await handle.result();

      if (result.status === "completed") {
        logger.info(
          {
            orderId: result.orderId,
            transactionId: result.transactionId,
            trackingNumber: result.trackingNumber,
          },
          `🎉 Order ${result.orderId} completed successfully!`,
        );
      } else {
        logger.error(
          {
            orderId: result.orderId,
            failureReason: result.failureReason,
            errorCode: result.errorCode,
          },
          `❌ Order ${result.orderId} failed`,
        );
      }
    } catch (error) {
      logger.error({ error, orderId: order.orderId }, "❌ Error processing order");
    }
  }

  logger.info("✨ Done!");
  logger.info("");
  logger.info("💡 Note: This client uses the BOXED worker implementation");
  logger.info("   (Result/Future pattern with explicit error types)");
  logger.info("   From the client's perspective, it's identical to the basic worker!");

  process.exit(0);
}

run().catch((err) => {
  logger.error({ err }, "❌ Client failed");
  process.exit(1);
});
