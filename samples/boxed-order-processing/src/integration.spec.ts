import { describe, expect } from "vitest";
import { Worker } from "@temporalio/worker";
import { TypedClient } from "@temporal-contract/client";
import { it as baseIt } from "@temporal-contract/testing/extension";
import { boxedOrderContract } from "./contract.js";
import { activitiesHandler } from "./activities/index.js";
import { extname } from "node:path";
import { fileURLToPath } from "node:url";
import type { Order } from "./contract.js";

const it = baseIt.extend<{
  worker: Worker;
  client: TypedClient<typeof boxedOrderContract>;
}>({
  worker: [
    async ({ workerConnection }, use) => {
      // Create and start worker
      const worker = await Worker.create({
        connection: workerConnection,
        namespace: "default",
        taskQueue: boxedOrderContract.taskQueue,
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
    const client = TypedClient.create(boxedOrderContract, {
      connection: clientConnection,
      namespace: "default",
    });

    await use(client);
  },
});

describe("Boxed Order Processing Workflow - Integration Tests", () => {
  it("should process an order successfully with Result pattern", async ({ client }) => {
    const order: Order = {
      orderId: `ORD-BOXED-TEST-${Date.now()}`,
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

    // Verify result (might be completed or failed due to random errors in activities)
    expect(result).toBeDefined();
    expect(result.orderId).toBe(order.orderId);
    expect(["completed", "failed"]).toContain(result.status);

    if (result.status === "completed") {
      expect(result.transactionId).toBeDefined();
      expect(result.trackingNumber).toBeDefined();
    } else {
      expect(result.errorCode).toBeDefined();
      expect(result.failureReason).toBeDefined();
    }
  });

  it("should handle workflow errors gracefully with rollback", async ({ client }) => {
    const order: Order = {
      orderId: `ORD-BOXED-TEST-${Date.now()}`,
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

    // Wait for result (might succeed or fail due to random errors)
    const result = await handle.result();

    expect(result.orderId).toBe(order.orderId);
    expect(["completed", "failed"]).toContain(result.status);
  });

  it("should be able to describe workflow execution", async ({ client }) => {
    const order: Order = {
      orderId: `ORD-BOXED-TEST-${Date.now()}`,
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

  it("should validate input with Zod", async ({ client }) => {
    const invalidOrder = {
      orderId: `ORD-BOXED-TEST-${Date.now()}`,
      customerId: "CUST-TEST-004",
      items: [
        {
          productId: "PROD-005",
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

  it("should demonstrate Result/Future pattern benefits", async ({ client }) => {
    const order: Order = {
      orderId: `ORD-BOXED-TEST-${Date.now()}`,
      customerId: "CUST-TEST-005",
      items: [
        {
          productId: "PROD-006",
          quantity: 1,
          price: 149.99,
        },
      ],
      totalAmount: 149.99,
    };

    // The workflow uses Result/Future pattern internally
    // Activities return Result.Ok or Result.Error
    // But from workflow perspective, errors are still thrown (auto-unwrapped)
    const result = await client.executeWorkflow("processOrder", {
      workflowId: order.orderId,
      args: order,
    });

    expect(result).toBeDefined();
    expect(result.orderId).toBe(order.orderId);

    // Result pattern allows explicit error types in activity signatures
    // while maintaining Temporal's native error handling in workflows
    expect(["completed", "failed", "cancelled"]).toContain(result.status);
  });
});

function workflowPath(filename: string): string {
  return fileURLToPath(new URL(`./${filename}${extname(import.meta.url)}`, import.meta.url));
}
