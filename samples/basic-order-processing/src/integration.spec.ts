import { describe, expect } from "vitest";
import { Worker } from "@temporalio/worker";
import { TypedClient } from "@temporal-contract/client";
import { it as baseIt } from "@temporal-contract/testing/extension";
import { orderProcessingContract } from "./contract.js";
import { activitiesHandler } from "./activities/index.js";
import { extname } from "node:path";
import { fileURLToPath } from "node:url";
import type { Order } from "./contract.js";

const it = baseIt.extend<{
  worker: Worker;
  client: TypedClient<typeof orderProcessingContract>;
}>({
  worker: [
    async ({ workerConnection }, use) => {
      // Create and start worker
      const worker = await Worker.create({
        connection: workerConnection,
        namespace: "default",
        taskQueue: orderProcessingContract.taskQueue,
        workflowsPath: workflowPath("workflows/processOrder"),
        activities: activitiesHandler.activities,
      });

      // Start worker in background
      worker.run().catch((err) => {
        console.error("Worker failed:", err);
      });

      await use(worker);

      await worker.shutdown();
    },
    { auto: true },
  ],
  client: async ({ clientConnection }, use) => {
    // Create typed client
    const client = TypedClient.create(orderProcessingContract, {
      connection: clientConnection,
      namespace: "default",
    });

    await use(client);
  },
});

describe("Order Processing Workflow - Integration Tests", () => {
  it("should process an order successfully", async ({ client }) => {
    const order: Order = {
      orderId: `ORD-TEST-${Date.now()}`,
      customerId: "CUST-TEST-001",
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

    // Execute workflow
    const result = await client.executeWorkflow("processOrder", {
      workflowId: order.orderId,
      args: order,
    });

    // Verify result
    expect(result).toBeDefined();
    expect(result.orderId).toBe(order.orderId);
    expect(result.status).toBe("completed");
    expect(result.transactionId).toBeDefined();
    expect(result.trackingNumber).toBeDefined();
  });

  it("should handle workflow with startWorkflow and result", async ({ client }) => {
    const order: Order = {
      orderId: `ORD-TEST-${Date.now()}`,
      customerId: "CUST-TEST-002",
      items: [
        {
          productId: "PROD-003",
          quantity: 1,
          price: 99.99,
        },
      ],
      totalAmount: 99.99,
    };

    // Start workflow
    const handle = await client.startWorkflow("processOrder", {
      workflowId: order.orderId,
      args: order,
    });

    expect(handle.workflowId).toBe(order.orderId);

    // Wait for result
    const result = await handle.result();

    expect(result.orderId).toBe(order.orderId);
    expect(result.status).toBe("completed");
  });

  it("should be able to get workflow handle after start", async ({ client }) => {
    const order: Order = {
      orderId: `ORD-TEST-${Date.now()}`,
      customerId: "CUST-TEST-003",
      items: [
        {
          productId: "PROD-004",
          quantity: 3,
          price: 19.99,
        },
      ],
      totalAmount: 59.97,
    };

    // Start workflow
    await client.startWorkflow("processOrder", {
      workflowId: order.orderId,
      args: order,
    });

    // Get handle
    const handle = await client.getHandle("processOrder", order.orderId);

    expect(handle.workflowId).toBe(order.orderId);

    // Get result
    const result = await handle.result();

    expect(result.orderId).toBe(order.orderId);
    expect(result.status).toBe("completed");
  });

  it("should handle describe and terminate operations", async ({ client }) => {
    const order: Order = {
      orderId: `ORD-TEST-${Date.now()}`,
      customerId: "CUST-TEST-004",
      items: [
        {
          productId: "PROD-005",
          quantity: 1,
          price: 149.99,
        },
      ],
      totalAmount: 149.99,
    };

    // Start workflow
    const handle = await client.startWorkflow("processOrder", {
      workflowId: order.orderId,
      args: order,
    });

    // Describe workflow
    const description = await handle.describe();

    expect(description).toBeDefined();
    expect(description.workflowId).toBe(order.orderId);
    expect(description.type).toBe("processOrder");

    // Wait for completion
    await handle.result();
  });

  it("should validate input data with Zod", async ({ client }) => {
    const invalidOrder = {
      orderId: `ORD-TEST-${Date.now()}`,
      customerId: "CUST-TEST-005",
      items: [
        {
          productId: "PROD-006",
          quantity: -1, // Invalid: negative quantity
          price: 29.99,
        },
      ],
      totalAmount: 29.99,
    };

    // Should throw validation error
    await expect(
      client.executeWorkflow("processOrder", {
        workflowId: invalidOrder.orderId,
        args: invalidOrder as Order,
      }),
    ).rejects.toThrow();
  });
});

function workflowPath(filename: string): string {
  return fileURLToPath(new URL(`./${filename}${extname(import.meta.url)}`, import.meta.url));
}
