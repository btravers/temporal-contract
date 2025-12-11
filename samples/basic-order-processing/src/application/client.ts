import { Connection } from "@temporalio/client";
import { TypedClient } from "@temporal-contract/client";
import {
  orderProcessingContract,
  OrderSchema,
} from "@temporal-contract/sample-basic-order-processing-contract";
import type { z } from "zod";
import { logger } from "../logger.js";

type Order = z.infer<typeof OrderSchema>;

/**
 * Example client to start order processing workflows
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

  // Example order
  const order: Order = {
    orderId: `ORD-${Date.now()}`,
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
  };

  logger.info({ order }, "📦 Creating order");

  try {
    // Start the workflow
    const handle = await contractClient.startWorkflow("processOrder", {
      workflowId: order.orderId,
      args: order,
    });

    logger.info({ workflowId: handle.workflowId }, `✅ Workflow started successfully!`);

    logger.info("⌛ Waiting for workflow result...");

    // Wait for the result (fully typed)
    const result = await handle.result();

    logger.info({ result }, "✅ Order processed successfully!");

    if (result.status === "completed") {
      logger.info(
        {
          orderId: result.orderId,
          transactionId: result.transactionId,
          trackingNumber: result.trackingNumber,
        },
        `🎉 Order ${result.orderId} completed!`,
      );
    } else {
      logger.error(
        {
          orderId: result.orderId,
          failureReason: result.failureReason,
        },
        `❌ Order ${result.orderId} failed`,
      );
    }
  } catch (error) {
    logger.error({ error }, "❌ Error");
    process.exit(1);
  }

  logger.info("✨ Done!");
  process.exit(0);
}

run().catch((err) => {
  logger.error({ err }, "❌ Client failed");
  process.exit(1);
});
