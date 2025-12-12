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
 * Order Processing Client
 *
 * This client demonstrates how to interact with the unified order processing contract.
 * It works with any worker implementation (basic or boxed) since they all implement
 * the same contract.
 *
 * Usage:
 *   1. Start Temporal server: temporal server start-dev
 *   2. Start a worker:
 *      - Basic: cd samples/basic-order-processing-worker && pnpm dev:worker
 *      - Boxed: cd samples/boxed-order-processing-worker && pnpm dev:worker
 *   3. Run this client: cd samples/order-processing-client && pnpm dev
 */
async function run() {
  logger.info("🚀 Starting Order Processing Client...");

  // Connect to Temporal server
  const connection = await Connection.connect({
    address: "localhost:7233",
  });

  // Create type-safe client for our contract
  const contractClient = TypedClient.create(orderProcessingContract, {
    connection,
    namespace: "default",
  });

  // Example orders to process
  const orders: Order[] = [
    {
      orderId: `ORD-${Date.now()}-001`,
      customerId: "CUST-123",
      items: [
        {
          productId: "PROD-001",
          quantity: 2,
          price: 29.99,
        },
        {
          productId: "PROD-002",
          quantity: 1,
          price: 49.99,
        },
      ],
      totalAmount: 109.97,
    },
    {
      orderId: `ORD-${Date.now()}-002`,
      customerId: "CUST-456",
      items: [
        {
          productId: "PROD-003",
          quantity: 3,
          price: 19.99,
        },
      ],
      totalAmount: 59.97,
    },
  ];

  logger.info("📦 Processing orders...");

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
  logger.info("💡 Note: This client works with any worker implementation");
  logger.info("   (basic or boxed) since they implement the same contract.");

  process.exit(0);
}

run().catch((err) => {
  logger.error({ err }, "❌ Client failed");
  process.exit(1);
});
