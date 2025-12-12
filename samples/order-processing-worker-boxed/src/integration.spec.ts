import { describe, expect, vi, beforeEach } from "vitest";
import { Worker } from "@temporalio/worker";
import { TypedClient } from "@temporal-contract/client";
import { it as baseIt } from "@temporal-contract/testing/extension";
import {
  orderProcessingContract,
  OrderSchema,
} from "@temporal-contract/sample-order-processing-contract";
import { activitiesHandler } from "./application/activities.js";
import { extname } from "node:path";
import { fileURLToPath } from "node:url";
import type { z } from "zod";
import { dependencies } from "./dependencies.js";
import { Future, Result } from "@swan-io/boxed";
import type { PaymentResult } from "./domain/entities/order.schema.js";

type Order = z.infer<typeof OrderSchema>;

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
        workflowsPath: workflowPath("application/workflows"),
        activities: activitiesHandler.activities,
      });

      // Start worker in background
      worker.run().catch((err) => {
        console.error("Worker failed:", err);
      });

      await vi.waitFor(() => worker.getState() === "RUNNING", { interval: 100 });

      await use(worker);

      worker.shutdown();

      await vi.waitFor(() => worker.getState() === "STOPPED", { interval: 100 });
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

describe("Boxed Order Processing Workflow - Integration Tests", () => {
  beforeEach(() => {
    // Mock payment adapter to always succeed for deterministic tests
    vi.spyOn(dependencies.paymentAdapter, "processPayment").mockReturnValue(
      Future.value(
        Result.Ok({
          transactionId: `TXN-${Date.now()}`,
          status: "success" as const,
          paidAmount: 100,
        }),
      ),
    );
  });

  it("should process an order successfully with Result pattern", async ({ client }) => {
    // GIVEN
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

    // WHEN
    const result = await client.executeWorkflow("processOrder", {
      workflowId: order.orderId,
      args: order,
    });

    // THEN
    expect(result).toEqual({
      orderId: order.orderId,
      status: "completed",
      transactionId: expect.any(String),
      trackingNumber: expect.any(String),
    });
  });

  it("should handle workflow errors gracefully with rollback", async ({ client }) => {
    // GIVEN
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

    // WHEN
    const handle = await client.startWorkflow("processOrder", {
      workflowId: order.orderId,
      args: order,
    });

    // THEN
    expect(handle.workflowId).toBe(order.orderId);

    await expect(handle.result()).resolves.toEqual(
      expect.objectContaining({
        orderId: order.orderId,
        status: "completed",
      }),
    );
  });

  it("should be able to describe workflow execution", async ({ client }) => {
    // GIVEN
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

    // WHEN
    const handle = await client.startWorkflow("processOrder", {
      workflowId: order.orderId,
      args: order,
    });

    // THEN
    await expect(handle.describe()).resolves.toEqual(
      expect.objectContaining({
        workflowId: order.orderId,
        type: "processOrder",
        status: expect.objectContaining({
          name: "RUNNING",
        }),
      }),
    );

    await handle.result();
  });

  it("should validate input with Zod", async ({ client }) => {
    // GIVEN
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

    // WHEN
    const execution = client.executeWorkflow("processOrder", {
      workflowId: invalidOrder.orderId,
      args: invalidOrder as Order,
    });

    // THEN
    await expect(execution).rejects.toThrow();
  });

  it("should demonstrate Result/Future pattern benefits", async ({ client }) => {
    // GIVEN
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

    // WHEN
    const result = await client.executeWorkflow("processOrder", {
      workflowId: order.orderId,
      args: order,
    });

    // THEN
    expect(result).toEqual(
      expect.objectContaining({
        orderId: order.orderId,
        status: expect.stringMatching(/^(completed|failed|cancelled)$/),
      }),
    );
  });

  it("should handle payment failure and return failed status", async ({ client }) => {
    // GIVEN
    const order: Order = {
      orderId: `ORD-BOXED-TEST-${Date.now()}`,
      customerId: "CUST-TEST-006",
      items: [
        {
          productId: "PROD-007",
          quantity: 1,
          price: 99.99,
        },
      ],
      totalAmount: 99.99,
    };

    // Mock payment to fail
    vi.spyOn(dependencies.paymentAdapter, "processPayment").mockReturnValue(
      Future.value(
        Result.Ok<PaymentResult>({
          status: "failed" as const,
        }),
      ),
    );

    // WHEN
    const result = await client.executeWorkflow("processOrder", {
      workflowId: order.orderId,
      args: order,
    });

    // THEN
    expect(result).toEqual({
      orderId: order.orderId,
      status: "failed",
      failureReason: "Payment was declined",
      errorCode: "PAYMENT_FAILED",
    });
  });
});

function workflowPath(filename: string): string {
  return fileURLToPath(new URL(`./${filename}${extname(import.meta.url)}`, import.meta.url));
}
