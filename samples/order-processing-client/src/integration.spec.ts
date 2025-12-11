import { describe, expect, vi } from "vitest";
import { Worker } from "@temporalio/worker";
import { TypedClient } from "@temporal-contract/client";
import { it as baseIt } from "@temporal-contract/testing/extension";
import {
  orderProcessingContract,
  OrderSchema,
  OrderResultSchema,
} from "@temporal-contract/sample-basic-order-processing-contract";
import { declareWorkflow } from "@temporal-contract/worker/workflow";
import { declareActivitiesHandler } from "@temporal-contract/worker/activity";
import { extname } from "node:path";
import { fileURLToPath } from "node:url";
import type { z } from "zod";

type Order = z.infer<typeof OrderSchema>;
type OrderResult = z.infer<typeof OrderResultSchema>;

function workflowPath(filename: string): string {
  return fileURLToPath(new URL(`./${filename}${extname(import.meta.url)}`, import.meta.url));
}

// Mock workflow that implements the contract
export const processOrder = declareWorkflow({
  workflowName: "processOrder",
  contract: orderProcessingContract,
  implementation: async (context, order: Order): Promise<OrderResult> => {
    const { activities } = context;

    // Log the order
    await activities.log({
      level: "info",
      message: `Processing order ${order.orderId}`,
    });

    // Process payment
    const paymentResult = await activities.processPayment({
      customerId: order.customerId,
      amount: order.totalAmount,
    });

    if (paymentResult.status === "failed") {
      await activities.log({
        level: "error",
        message: "Payment failed",
      });
      return {
        orderId: order.orderId,
        status: "failed",
        failureReason: "Payment failed",
      };
    }

    // Reserve inventory
    const inventoryResult = await activities.reserveInventory(order.items);

    if (!inventoryResult.reserved) {
      await activities.log({
        level: "error",
        message: "Inventory reservation failed",
      });
      // Refund payment
      await activities.refundPayment(paymentResult.transactionId);
      return {
        orderId: order.orderId,
        status: "failed",
        failureReason: "Out of stock",
      };
    }

    // Create shipment
    const shippingResult = await activities.createShipment({
      orderId: order.orderId,
      customerId: order.customerId,
    });

    // Send notification
    await activities.sendNotification({
      customerId: order.customerId,
      subject: "Order Confirmed",
      message: `Your order ${order.orderId} has been confirmed`,
    });

    await activities.log({
      level: "info",
      message: `Order ${order.orderId} processed successfully`,
    });

    return {
      orderId: order.orderId,
      status: "completed",
      transactionId: paymentResult.transactionId,
      trackingNumber: shippingResult.trackingNumber,
    };
  },
});

// Mock activities handler
const mockActivitiesHandler = declareActivitiesHandler({
  contract: orderProcessingContract,
  activities: {
    log: async ({ level, message }) => {
      console.log(`[${level}] ${message}`);
    },
    sendNotification: async ({ customerId, subject, message }) => {
      console.log(`Notification to ${customerId}: ${subject} - ${message}`);
    },
    processPayment: async ({ amount }) => {
      return {
        status: "success" as const,
        transactionId: `TXN-${Date.now()}`,
        paidAmount: amount,
      };
    },
    reserveInventory: async () => {
      return {
        reserved: true,
        reservationId: `RES-${Date.now()}`,
      };
    },
    releaseInventory: async (reservationId) => {
      console.log(`Released inventory: ${reservationId}`);
    },
    createShipment: async () => {
      return {
        trackingNumber: `TRACK-${Date.now()}`,
        estimatedDelivery: new Date(Date.now() + 86400000 * 3).toISOString(),
      };
    },
    refundPayment: async (transactionId) => {
      console.log(`Refunded payment: ${transactionId}`);
    },
  },
});

const it = baseIt.extend<{
  worker: Worker;
  client: TypedClient<typeof orderProcessingContract>;
}>({
  worker: [
    async ({ workerConnection }, use) => {
      // Create and start worker with mock implementation
      const worker = await Worker.create({
        connection: workerConnection,
        namespace: "default",
        taskQueue: orderProcessingContract.taskQueue,
        workflowsPath: workflowPath("integration.spec"),
        activities: mockActivitiesHandler.activities,
      });

      // Start worker in background
      worker.run().catch((err: Error) => {
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

describe("Order Processing Client - Integration Tests", () => {
  it("should successfully process an order through the contract", async ({ client }) => {
    // GIVEN
    const order: Order = {
      orderId: `ORD-CLIENT-TEST-${Date.now()}`,
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
    const handle = await client.startWorkflow("processOrder", {
      workflowId: order.orderId,
      args: order,
    });

    const result = await handle.result();

    // THEN
    expect(result).toMatchObject({
      orderId: order.orderId,
      status: "completed",
    });
    expect(result.transactionId).toBeDefined();
    expect(result.trackingNumber).toBeDefined();
  });

  it("should handle workflow execution and allow describing it", async ({ client }) => {
    // GIVEN
    const order: Order = {
      orderId: `ORD-CLIENT-TEST-${Date.now()}`,
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

    const result = await handle.result();

    // THEN - Verify workflow execution
    expect(result.status).toBe("completed");

    // Verify we can describe the workflow
    const description = await handle.describe();
    expect(description.workflowId).toBe(order.orderId);
    expect(description.type).toBe("processOrder");

    // Verify workflow history contains our activities
    const history = description.raw.workflowExecutionInfo;
    expect(history).toBeDefined();
  });

  it("should validate input data with contract schema", async ({ client }) => {
    // GIVEN - Invalid order (missing required fields)
    const invalidOrder = {
      orderId: `ORD-CLIENT-TEST-${Date.now()}`,
      // Missing customerId, items, totalAmount
    };

    // WHEN/THEN - Should fail validation
    await expect(
      client.startWorkflow("processOrder", {
        workflowId: invalidOrder.orderId,
        args: invalidOrder as Order,
      }),
    ).rejects.toThrow();
  });

  it("should return typed result matching contract schema", async ({ client }) => {
    // GIVEN
    const order: Order = {
      orderId: `ORD-CLIENT-TEST-${Date.now()}`,
      customerId: "CUST-TEST-003",
      items: [
        {
          productId: "PROD-004",
          quantity: 5,
          price: 19.99,
        },
      ],
      totalAmount: 99.95,
    };

    // WHEN
    const handle = await client.startWorkflow("processOrder", {
      workflowId: order.orderId,
      args: order,
    });

    const result = await handle.result();

    // THEN - Verify result matches contract schema
    const parseResult = OrderResultSchema.safeParse(result);
    expect(parseResult.success).toBe(true);

    // Verify required fields
    expect(result).toHaveProperty("orderId");
    expect(result).toHaveProperty("status");
    expect(["completed", "failed"]).toContain(result.status);

    // For completed orders, verify additional fields
    if (result.status === "completed") {
      expect(result).toHaveProperty("transactionId");
      expect(result).toHaveProperty("trackingNumber");
    }
  });
});
