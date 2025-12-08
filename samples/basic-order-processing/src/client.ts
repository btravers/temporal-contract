import { Connection } from "@temporalio/client";
import { TypedClient } from "@temporal-contract/client";
import { orderProcessingContract } from "./contract.js";
import type { Order, OrderResult } from "./contract.js";

/**
 * Example client to start order processing workflows
 */
async function run() {
  console.log("🚀 Starting Order Processing Client...\n");

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

  console.log("📦 Creating order:", JSON.stringify(order, null, 2), "\n");

  try {
    // Start the workflow
    const handle = await contractClient.startWorkflow("processOrder", {
      workflowId: order.orderId,
      args: [order],
    });

    console.log(`✅ Workflow started successfully!`);
    console.log(`   Workflow ID: ${handle.workflowId}\n`);

    console.log("⏳ Waiting for workflow result...\n");

    // Wait for the result
    const result = await handle.result() as OrderResult;

    console.log("✅ Order processed successfully!");
    console.log("   Result:", JSON.stringify(result, null, 2));

    if (result.status === "completed") {
      console.log(`\n🎉 Order ${result.orderId} completed!`);
      console.log(`   Transaction ID: ${result.transactionId}`);
      console.log(`   Tracking Number: ${result.trackingNumber}`);
    } else {
      console.log(`\n❌ Order ${result.orderId} failed`);
      console.log(`   Reason: ${result.failureReason}`);
    }
  } catch (error) {
    console.error("❌ Error:", error);
    process.exit(1);
  }

  console.log("\n✨ Done!");
  process.exit(0);
}

run().catch((err) => {
  console.error("❌ Client failed:", err);
  process.exit(1);
});
