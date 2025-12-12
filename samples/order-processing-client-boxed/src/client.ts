import { Connection } from "@temporalio/client";
import { TypedClientBoxed, Result } from "@temporal-contract/client-boxed";
import {
  orderProcessingContract,
  OrderSchema,
} from "@temporal-contract/sample-order-processing-contract";
import type { z } from "zod";
import { logger } from "./logger.js";

type Order = z.infer<typeof OrderSchema>;

/**
 * Order Processing Client with Boxed Pattern
 *
 * This client demonstrates how to interact with the unified order processing contract
 * using the Result/Future pattern from @swan-io/boxed for explicit error handling.
 *
 * Usage:
 *   1. Start Temporal server: temporal server start-dev
 *   2. Start a worker:
 *      - Basic: cd samples/order-processing-worker && pnpm dev:worker
 *      - Boxed: cd samples/order-processing-worker-boxed && pnpm dev:worker
 *   3. Run this client: cd samples/order-processing-client-boxed && pnpm dev
 */
async function run() {
  logger.info("🚀 Starting Order Processing Client (Boxed Pattern)...");

  // Connect to Temporal server
  const connection = await Connection.connect({
    address: "localhost:7233",
  });

  // Create type-safe client with boxed pattern
  const contractClient = TypedClientBoxed.create(orderProcessingContract, {
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

  logger.info("📦 Processing orders with Result/Future pattern...");

  for (const order of orders) {
    try {
      logger.info({ order }, `📦 Creating order: ${order.orderId}`);

      // Start the workflow - returns Future<Result<Handle, Error>>
      const handleFuture = contractClient.startWorkflow("processOrder", {
        workflowId: order.orderId,
        args: order,
      });

      // Unwrap Future to get Result
      const handleResult = await handleFuture.toPromise();

      // Use Result pattern matching for explicit error handling
      await handleResult.match({
        Ok: async (handle) => {
          logger.info(
            { workflowId: handle.workflowId },
            `✅ Workflow started: ${handle.workflowId}`,
          );
          logger.info("⌛ Waiting for workflow result...");

          // Wait for the result (also returns Future<Result>)
          const resultFuture = handle.result();
          const result = await resultFuture.toPromise();

          // Match on result
          result.match({
            Ok: (output) => {
              if (output.status === "completed") {
                logger.info(
                  {
                    orderId: output.orderId,
                    transactionId: output.transactionId,
                    trackingNumber: output.trackingNumber,
                  },
                  `🎉 Order ${output.orderId} completed successfully!`,
                );
              } else {
                logger.error(
                  {
                    orderId: output.orderId,
                    failureReason: output.failureReason,
                    errorCode: output.errorCode,
                  },
                  `❌ Order ${output.orderId} failed`,
                );
              }
            },
            Error: (error) => {
              logger.error({ error, orderId: order.orderId }, "❌ Workflow execution failed");
            },
          });
        },
        Error: (error) => {
          logger.error({ error, orderId: order.orderId }, "❌ Failed to start workflow");
        },
      });
    } catch (error) {
      logger.error({ error, orderId: order.orderId }, "❌ Unexpected error processing order");
    }
  }

  // Example using executeWorkflow with functional composition
  logger.info("\n📦 Example: Using executeWorkflow with Result pattern...");

  const exampleOrder: Order = {
    orderId: `ORD-${Date.now()}-EXAMPLE`,
    customerId: "CUST-789",
    items: [
      {
        productId: "PROD-004",
        quantity: 1,
        price: 99.99,
      },
    ],
    totalAmount: 99.99,
  };

  // Execute workflow - returns Future<Result<Output, Error>>
  const executeFuture = contractClient.executeWorkflow("processOrder", {
    workflowId: exampleOrder.orderId,
    args: exampleOrder,
  });

  const executeResult = await executeFuture.toPromise();

  // Transform the result with map
  const summary = executeResult.map((output) => ({
    id: output.orderId,
    success: output.status === "completed",
    message:
      output.status === "completed"
        ? `Order completed with tracking: ${output.trackingNumber}`
        : `Order failed: ${output.failureReason}`,
  }));

  // Match on transformed result
  summary.match({
    Ok: (data) => {
      logger.info({ data }, `📊 Order summary: ${data.message}`);
    },
    Error: (error) => {
      logger.error({ error }, "❌ Failed to execute workflow");
    },
  });

  logger.info("\n✨ Done!");
  logger.info("");
  logger.info("💡 Benefits of Result/Future pattern:");
  logger.info("   - Explicit error handling - no hidden exceptions");
  logger.info("   - Type-safe error values");
  logger.info("   - Functional composition with map, flatMap, etc.");
  logger.info("   - Railway-oriented programming");

  process.exit(0);
}

run().catch((err) => {
  logger.error({ err }, "❌ Client failed");
  process.exit(1);
});
