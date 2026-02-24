import { describe, expect, vi } from "vitest";
import { Worker } from "@temporalio/worker";
import { Client } from "@temporalio/client";
import { Effect, Exit, Cause } from "effect";
import { EffectTypedClient } from "@temporal-contract/client-effect";
import type { WorkflowValidationError } from "@temporal-contract/client-effect";
import { it as baseIt } from "@temporal-contract/testing/extension";
import { extname } from "node:path";
import { fileURLToPath } from "node:url";
import { orderEffectContract, type OrderSchema } from "./contract.js";
import { activities } from "./application/activities.js";
import { paymentAdapter } from "./dependencies.js";
import type { Schema } from "effect";

type Order = Schema.Schema.Type<typeof OrderSchema>;

const it = baseIt.extend<{
  worker: Worker;
  client: EffectTypedClient<typeof orderEffectContract>;
}>({
  worker: [
    async ({ workerConnection }, use) => {
      const worker = await Worker.create({
        connection: workerConnection,
        namespace: "default",
        taskQueue: orderEffectContract.taskQueue,
        workflowsPath: workflowPath("application/workflows"),
        activities,
      });

      worker.run().catch((err) => {
        console.error("Worker failed:", err);
      });

      await vi.waitFor(() => worker.getState() === "RUNNING", { interval: 100, timeout: 5000 });

      await use(worker);

      await worker.shutdown();

      await vi.waitFor(() => worker.getState() === "STOPPED", { interval: 100, timeout: 5000 });
    },
    { auto: true },
  ],

  client: async ({ clientConnection }, use) => {
    const rawClient = new Client({ connection: clientConnection, namespace: "default" });
    const client = EffectTypedClient.create(orderEffectContract, rawClient);
    await use(client);
  },
});

describe("Order Processing Workflow - Integration Tests (Effect)", () => {
  it("should process an order successfully", async ({ client }) => {
    // GIVEN
    vi.spyOn(paymentAdapter, "processPayment").mockResolvedValue({
      transactionId: "TXN-MOCK-123",
      status: "success",
      paidAmount: 0,
    });

    const order: Order = {
      orderId: `ORD-TEST-${Date.now()}`,
      customerId: "CUST-TEST-001",
      items: [
        { productId: "PROD-001", quantity: 2, price: 29.99 },
        { productId: "PROD-002", quantity: 1, price: 49.99 },
      ],
      totalAmount: 109.97,
    };

    // WHEN — Effect.runPromise returns the value directly on success
    const result = await Effect.runPromise(
      client.executeWorkflow("processOrder", {
        workflowId: order.orderId,
        args: order,
      }),
    );

    // THEN
    expect(result).toEqual(
      expect.objectContaining({
        orderId: order.orderId,
        status: "completed",
        transactionId: expect.any(String),
        trackingNumber: expect.any(String),
      }),
    );
  });

  it("should handle startWorkflow and typed handle result()", async ({ client }) => {
    // GIVEN
    vi.spyOn(paymentAdapter, "processPayment").mockResolvedValue({
      transactionId: "TXN-MOCK-456",
      status: "success",
      paidAmount: 0,
    });

    const order: Order = {
      orderId: `ORD-TEST-${Date.now()}`,
      customerId: "CUST-TEST-002",
      items: [{ productId: "PROD-003", quantity: 1, price: 99.99 }],
      totalAmount: 99.99,
    };

    // WHEN
    const handle = await Effect.runPromise(
      client.startWorkflow("processOrder", {
        workflowId: order.orderId,
        args: order,
      }),
    );

    // THEN — handle.workflowId is typed and correct
    expect(handle.workflowId).toBe(order.orderId);

    const result = await Effect.runPromise(handle.result());

    expect(result).toEqual(
      expect.objectContaining({
        orderId: order.orderId,
        status: "completed",
        transactionId: expect.any(String),
        trackingNumber: expect.any(String),
      }),
    );
  });

  it("should retrieve a handle for an existing workflow via getHandle", async ({ client }) => {
    // GIVEN
    vi.spyOn(paymentAdapter, "processPayment").mockResolvedValue({
      transactionId: "TXN-MOCK-789",
      status: "success",
      paidAmount: 0,
    });

    const order: Order = {
      orderId: `ORD-TEST-${Date.now()}`,
      customerId: "CUST-TEST-003",
      items: [{ productId: "PROD-004", quantity: 3, price: 19.99 }],
      totalAmount: 59.97,
    };

    await Effect.runPromise(
      client.startWorkflow("processOrder", {
        workflowId: order.orderId,
        args: order,
      }),
    );

    // WHEN — get handle by workflow ID
    const handle = await Effect.runPromise(client.getHandle("processOrder", order.orderId));

    // THEN
    expect(handle.workflowId).toBe(order.orderId);

    const result = await Effect.runPromise(handle.result());
    expect(result).toEqual(
      expect.objectContaining({
        orderId: order.orderId,
        status: "completed",
      }),
    );
  });

  it("should describe a running workflow via Effect handle", async ({ client }) => {
    // GIVEN
    vi.spyOn(paymentAdapter, "processPayment").mockResolvedValue({
      transactionId: "TXN-MOCK-DESC",
      status: "success",
      paidAmount: 0,
    });

    const order: Order = {
      orderId: `ORD-TEST-${Date.now()}`,
      customerId: "CUST-TEST-004",
      items: [{ productId: "PROD-005", quantity: 1, price: 149.99 }],
      totalAmount: 149.99,
    };

    // WHEN
    const handle = await Effect.runPromise(
      client.startWorkflow("processOrder", {
        workflowId: order.orderId,
        args: order,
      }),
    );

    const description = await Effect.runPromise(handle.describe());

    // THEN
    expect(description).toEqual(
      expect.objectContaining({
        workflowId: order.orderId,
        type: "processOrder",
      }),
    );

    // Wait for completion
    await Effect.runPromise(handle.result());
  });

  it("should fail with WorkflowValidationError for invalid input schema", async ({ client }) => {
    // GIVEN — quantity is a string instead of a number
    const invalidOrder = {
      orderId: `ORD-TEST-${Date.now()}`,
      customerId: "CUST-TEST-005",
      items: [{ productId: "PROD-006", quantity: "not-a-number", price: 29.99 }],
      totalAmount: 29.99,
    };

    // WHEN — client validates input against Effect Schema before sending to Temporal
    const exit = await Effect.runPromiseExit(
      client.executeWorkflow("processOrder", {
        workflowId: invalidOrder.orderId,
        args: invalidOrder as unknown as Order,
      }),
    );

    // THEN — typed error with direction and parseError
    expect(Exit.isFailure(exit)).toBe(true);
    if (Exit.isFailure(exit)) {
      const error = Cause.failureOption(exit.cause);
      expect(error._tag).toBe("Some");
      if (error._tag === "Some") {
        const e = error.value as WorkflowValidationError;
        expect(e._tag).toBe("WorkflowValidationError");
        expect(e.workflowName).toBe("processOrder");
        expect(e.direction).toBe("input");
      }
    }
  });

  it("should use Effect.catchTag for typed error recovery", async ({ client }) => {
    // GIVEN — invalid input triggers WorkflowValidationError
    const invalidOrder = {
      orderId: `ORD-TEST-${Date.now()}`,
      customerId: "CUST-TEST-006",
      items: [{ productId: "PROD-007", quantity: -1, price: 29.99 }],
      totalAmount: 29.99,
    };

    // WHEN — recover from validation error with Effect.catchTag
    const result = await Effect.runPromise(
      Effect.catchTag(
        client.executeWorkflow("processOrder", {
          workflowId: invalidOrder.orderId,
          args: invalidOrder as unknown as Order,
        }),
        "WorkflowValidationError",
        (_e) =>
          Effect.succeed({
            orderId: invalidOrder.orderId,
            status: "failed" as const,
            failureReason: "Validation failed",
            errorCode: "INVALID_INPUT",
          }),
      ),
    );

    // THEN — the catchTag handler produced a fallback result
    expect(result).toEqual(
      expect.objectContaining({
        status: "failed",
        errorCode: "INVALID_INPUT",
      }),
    );
  });

  it("should handle payment failure and return failed status", async ({ client }) => {
    // GIVEN
    vi.spyOn(paymentAdapter, "processPayment").mockResolvedValue({ status: "failed" });

    const order: Order = {
      orderId: `ORD-TEST-${Date.now()}`,
      customerId: "CUST-TEST-007",
      items: [{ productId: "PROD-008", quantity: 1, price: 99.99 }],
      totalAmount: 99.99,
    };

    // WHEN
    const result = await Effect.runPromise(
      client.executeWorkflow("processOrder", {
        workflowId: order.orderId,
        args: order,
      }),
    );

    // THEN
    expect(result).toEqual(
      expect.objectContaining({
        orderId: order.orderId,
        status: "failed",
        errorCode: "PAYMENT_FAILED",
        failureReason: "Payment was declined",
      }),
    );
  });

  it("should use Effect.catchTags to exhaustively handle all error variants", async ({
    client,
  }) => {
    // GIVEN — invalid input
    const invalidOrder = {
      orderId: `ORD-TEST-${Date.now()}`,
      customerId: "",
      items: [],
      totalAmount: 0,
    };

    // WHEN — handle all possible typed errors exhaustively
    const exit = await Effect.runPromiseExit(
      Effect.catchTags(
        client.executeWorkflow("processOrder", {
          workflowId: invalidOrder.orderId,
          args: invalidOrder as unknown as Order,
        }),
        {
          WorkflowValidationError: (e) =>
            Effect.succeed({ caught: "validation", direction: e.direction }),
          WorkflowNotFoundError: (e) =>
            Effect.succeed({ caught: "not-found", workflow: e.workflowName }),
          RuntimeClientError: (e) => Effect.succeed({ caught: "runtime", operation: e.operation }),
        },
      ),
    );

    expect(Exit.isSuccess(exit)).toBe(true);
    if (Exit.isSuccess(exit)) {
      expect(exit.value).toEqual(expect.objectContaining({ caught: "validation" }));
    }
  });
});

function workflowPath(filename: string): string {
  return fileURLToPath(new URL(`./${filename}${extname(import.meta.url)}`, import.meta.url));
}
