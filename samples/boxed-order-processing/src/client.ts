import { Connection } from "@temporalio/client";
import { TypedClient } from "@temporal-contract/client";
import { boxedOrderContract } from "./contract.js";
import type { Order, OrderResult } from "./contract.js";

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

  console.log("🎯 Starting Boxed Order Processing Workflows\n");

  // Start workflows for each order
  for (const order of orders) {
    try {
      console.log(`📦 Processing order: ${order.orderId}`);
      console.log(`   Customer: ${order.customerId}`);
      console.log(`   Total: $${order.totalAmount}`);
      console.log(`   Items: ${order.items.length}`);

      // Start workflow with type-safe contract
      const handle = await client.startWorkflow("processOrder", {
        workflowId: order.orderId,
        args: order,
      });

      console.log(`   ✓ Workflow started: ${handle.workflowId}\n`);

      // Wait for result (optional - for demo purposes)
      const result = (await handle.result()) as OrderResult;

      console.log(`   📋 Result for ${order.orderId}:`);
      console.log(`      Status: ${result.status}`);
      if (result.status === "completed") {
        console.log(`      Transaction: ${result.transactionId}`);
        console.log(`      Tracking: ${result.trackingNumber}`);
      } else {
        console.log(`      Reason: ${result.failureReason}`);
        console.log(`      Error Code: ${result.errorCode}`);
      }
      console.log();
    } catch (error) {
      console.error(`   ✗ Error processing order ${order.orderId}:`, error);
      console.log();
    }
  }

  console.log("✅ All workflows completed!");
  console.log("\nNote: The Result/Future pattern provides explicit error handling");
  console.log("in activity implementations, making errors visible in type signatures.");
}

runClient().catch((err) => {
  console.error("Client error:", err);
  process.exit(1);
});
