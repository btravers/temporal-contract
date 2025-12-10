import { Connection } from "@temporalio/client";
import { TypedClient } from "@temporal-contract/client";
import { boxedOrderContract } from "./contract.js";
import type { Order, OrderResult } from "./contract.js";
import pino from "pino";

const logger = pino();

/**
 * Client for Boxed Order Processing
 *
 * This demonstrates how to use the type-safe client to start workflows.
 * Note: Client code is identical to the standard worker approach.
 * The Result/Future pattern is internal to activity implementations.
 */

async function runClient() {
  // Connect to Temporal Server
  const connection = await Connection.connect({
    address: "localhost:7233",
  });

  // Create type-safe client
  const client = TypedClient.create(boxedOrderContract, {
    connection,
    namespace: "default",
  });

  // Sample orders to process
  const orders: Order[] = [
    {
      orderId: "ORD-BOXED-001",
      customerId: "CUST-001",
      items: [
        { productId: "PROD-A", quantity: 2, price: 29.99 },
        { productId: "PROD-B", quantity: 1, price: 49.99 },
      ],
      totalAmount: 109.97,
    },
    {
      orderId: "ORD-BOXED-002",
      customerId: "CUST-002",
      items: [{ productId: "PROD-C", quantity: 3, price: 19.99 }],
      totalAmount: 59.97,
    },
    {
      orderId: "ORD-BOXED-003",
      customerId: "CUST-003",
      items: [
        { productId: "PROD-D", quantity: 1, price: 199.99 },
        { productId: "PROD-E", quantity: 2, price: 39.99 },
      ],
      totalAmount: 279.97,
    },
  ];

  logger.info("🎯 Starting Boxed Order Processing Workflows");

  // Start workflows for each order
  for (const order of orders) {
    try {
      logger.info(
        {
          orderId: order.orderId,
          customerId: order.customerId,
          totalAmount: order.totalAmount,
          itemCount: order.items.length,
        },
        `📦 Processing order: ${order.orderId}`,
      );

      // Start workflow with type-safe contract
      const handle = await client.startWorkflow("processOrder", {
        workflowId: order.orderId,
        args: order,
      });

      logger.info({ workflowId: handle.workflowId }, `   ✓ Workflow started: ${handle.workflowId}`);

      // Wait for result (optional - for demo purposes)
      const result = (await handle.result()) as OrderResult;

      if (result.status === "completed") {
        logger.info(
          {
            orderId: order.orderId,
            status: result.status,
            transactionId: result.transactionId,
            trackingNumber: result.trackingNumber,
          },
          `   📋 Result for ${order.orderId}`,
        );
      } else {
        logger.warn(
          {
            orderId: order.orderId,
            status: result.status,
            failureReason: result.failureReason,
          },
          `   📋 Result for ${order.orderId}`,
        );
      }
    } catch (error) {
      logger.error(
        { orderId: order.orderId, error },
        `   ✗ Error processing order ${order.orderId}`,
      );
    }
  }

  logger.info("✅ All workflows completed!");
  logger.info("Note: The Result/Future pattern provides explicit error handling");
  logger.info("in activity implementations, making errors visible in type signatures.");
}

runClient().catch((err) => {
  logger.error({ err }, "Client error");
  process.exit(1);
});
