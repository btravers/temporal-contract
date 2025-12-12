import { Connection } from "@temporalio/client";
import { TypedClient } from "@temporal-contract/client";
import {
  orderProcessingContract,
  OrderSchema,
} from "@temporal-contract/sample-order-processing-contract";
import type { z } from "zod";
import { match } from "ts-pattern";
import { logger } from "./logger.js";

type Order = z.infer<typeof OrderSchema>;

/**
 * Order Processing Client with Result/Future Pattern
 *
 * This client demonstrates how to interact with the unified order processing contract
 * using the Result/Future pattern from @swan-io/boxed for explicit error handling.
 *
 * Usage:
 *   1. Start Temporal server: temporal server start-dev
 *   2. Start a worker: cd samples/order-processing-worker && pnpm dev:worker
 *   3. Run this client: cd samples/order-processing-client && pnpm dev
 */
async function run() {
  logger.info("🚀 Starting Order Processing Client (Result/Future Pattern)...");

  // Connect to Temporal server
  const connection = await Connection.connect({
    address: "localhost:7233",
  });

  // Create type-safe client with Result/Future pattern
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

  logger.info("📦 Processing orders with Result/Future pattern...");

  for (const order of orders) {
    logger.info({ order }, `📦 Creating order: ${order.orderId}`);

    // Use flatMapOk to chain operations and handle errors with tapError
    await contractClient
      .startWorkflow("processOrder", {
        workflowId: order.orderId,
        args: order,
      })
      .tapError((error) => {
        // Log error but continue the chain
        match(error)
          .with({ name: "WorkflowNotFoundError" }, (err) => {
            logger.error({ error: err, orderId: order.orderId }, "❌ Workflow not found");
          })
          .with({ name: "WorkflowValidationError" }, (err) => {
            logger.error({ error: err, orderId: order.orderId }, "❌ Workflow validation failed");
          })
          .with({ name: "TypedClientError" }, (err) => {
            logger.error({ error: err, orderId: order.orderId }, "❌ Failed to start workflow");
          })
          .otherwise((err) => {
            logger.error(
              { error: err, orderId: order.orderId },
              "❌ Unknown error starting workflow",
            );
          });
      })
      .flatMapOk((handle) => {
        logger.info({ workflowId: handle.workflowId }, `✅ Workflow started: ${handle.workflowId}`);
        logger.info("⌛ Waiting for workflow result...");
        return handle.result();
      })
      .tapOk((output) => {
        // Handle successful result
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
      })
      .tapError((error) => {
        // Handle workflow execution errors
        match(error)
          .with({ name: "WorkflowValidationError" }, (err) => {
            logger.error(
              { error: err, orderId: order.orderId },
              "❌ Workflow result validation failed",
            );
          })
          .with({ name: "TypedClientError" }, (err) => {
            logger.error({ error: err, orderId: order.orderId }, "❌ Workflow execution failed");
          })
          .otherwise((err) => {
            logger.error(
              { error: err, orderId: order.orderId },
              "❌ Unknown error during workflow execution",
            );
          });
      })
      .toPromise();
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

  // Execute workflow - use flatMapOk to transform the result
  await contractClient
    .executeWorkflow("processOrder", {
      workflowId: exampleOrder.orderId,
      args: exampleOrder,
    })
    .flatMapOk((output) => {
      // Transform the result
      const summary = {
        id: output.orderId,
        success: output.status === "completed",
        message:
          output.status === "completed"
            ? `Order completed with tracking: ${output.trackingNumber}`
            : `Order failed: ${output.failureReason}`,
      };
      logger.info({ data: summary }, `📊 Order summary: ${summary.message}`);
      return contractClient.executeWorkflow("processOrder", {
        workflowId: `${exampleOrder.orderId}-NEXT`,
        args: exampleOrder,
      });
    })
    .tapError((error) => {
      // Handle all errors with pattern matching
      match(error)
        .with({ name: "WorkflowNotFoundError" }, (err) => {
          logger.error({ error: err }, "❌ Workflow not found");
        })
        .with({ name: "WorkflowValidationError" }, (err) => {
          logger.error({ error: err }, "❌ Validation failed");
        })
        .with({ name: "TypedClientError" }, (err) => {
          logger.error({ error: err }, "❌ Workflow execution failed");
        })
        .otherwise((err) => {
          logger.error({ error: err }, "❌ Unknown error");
        });
    })
    .toPromise();

  logger.info("\n✨ Done!");
  logger.info("");
  logger.info("💡 Benefits of Result/Future pattern:");
  logger.info("   - Explicit error handling - no hidden exceptions");
  logger.info("   - Type-safe error values");
  logger.info("   - Functional composition with flatMapOk, tapOk, tapError");
  logger.info("   - Railway-oriented programming");
  logger.info("   - Exhaustive error matching with ts-pattern");

  process.exit(0);
}

run().catch((err) => {
  logger.error({ err }, "❌ Client failed");
  process.exit(1);
});
