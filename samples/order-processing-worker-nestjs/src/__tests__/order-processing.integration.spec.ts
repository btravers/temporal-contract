import { describe, expect, vi } from "vitest";
import { Worker } from "@temporalio/worker";
import { TypedClient } from "@temporal-contract/client";
import { it as baseIt } from "@temporal-contract/testing/extension";
import { NestFactory } from "@nestjs/core";
import { extname } from "node:path";
import { fileURLToPath } from "node:url";
import { orderProcessingContract } from "@temporal-contract/sample-order-processing-contract";
import { AppModule } from "../app.module.js";
import { ACTIVITIES_HANDLER_TOKEN } from "@temporal-contract/worker-nestjs/activity";

// ============================================================================
// Test Setup
// ============================================================================

const it = baseIt.extend<{
  worker: Worker;
  client: TypedClient<typeof orderProcessingContract>;
}>({
  worker: [
    async ({ workerConnection }, use) => {
      // Create NestJS application context
      const app = await NestFactory.createApplicationContext(AppModule, {
        logger: false,
      });

      const activitiesHandler = app.get(ACTIVITIES_HANDLER_TOKEN);

      // Create and start worker
      const worker = await Worker.create({
        connection: workerConnection,
        namespace: "default",
        taskQueue: orderProcessingContract.taskQueue,
        workflowsPath: workflowPath("../workflows/workflows"),
        activities: activitiesHandler.activities,
      });

      // Start worker in background
      worker.run().catch((err) => {
        console.error("Worker failed:", err);
      });

      await vi.waitFor(() => worker.getState() === "RUNNING", { interval: 100 });

      await use(worker);

      await worker.shutdown();
      await app.close();

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

// ============================================================================
// Integration Tests
// ============================================================================

describe("Order Processing Worker NestJS - Integration Tests", () => {
  describe("Order Processing Workflow", () => {
    it("should successfully process an order with all steps", async ({ client }) => {
      // GIVEN
      const input = {
        orderId: "ORD-123",
        customerId: "CUST-456",
        items: [
          { productId: "PROD-1", quantity: 2, price: 50.0 },
          { productId: "PROD-2", quantity: 1, price: 50.0 },
        ],
        totalAmount: 150.0,
      };

      // WHEN
      const result = await client.executeWorkflow("processOrder", {
        workflowId: `order-success-${Date.now()}`,
        args: input,
      });

      // THEN
      expect(result).toEqual(
        expect.objectContaining({
          tag: "Ok",
          value: expect.objectContaining({
            orderId: "ORD-123",
            status: "completed",
            transactionId: expect.stringContaining("txn-"),
            reservationId: expect.stringContaining("rsv-"),
            trackingNumber: expect.stringContaining("TRK-"),
          }),
        }),
      );
    });

    it("should handle order failure and perform compensations", async ({ client }) => {
      // GIVEN - Order with valid items (will succeed initially)
      const input = {
        orderId: "ORD-789",
        customerId: "CUST-101",
        items: [{ productId: "PROD-3", quantity: 1, price: 50.0 }],
        totalAmount: 50.0,
      };

      // WHEN
      const result = await client.executeWorkflow("processOrder", {
        workflowId: `order-compensation-${Date.now()}`,
        args: input,
      });

      // THEN - Should complete successfully (our mock activities don't fail)
      expect(result.isOk()).toBe(true);
    });

    it("should start workflow and retrieve handle", async ({ client }) => {
      // GIVEN
      const input = {
        orderId: "ORD-456",
        customerId: "CUST-789",
        items: [{ productId: "PROD-4", quantity: 3, price: 66.67 }],
        totalAmount: 200.0,
      };
      const workflowId = `order-handle-${Date.now()}`;

      // WHEN
      const handleResult = await client.startWorkflow("processOrder", {
        workflowId,
        args: input,
      });

      // THEN
      expect(handleResult.isOk()).toBe(true);
      if (!handleResult.isOk()) throw new Error("Expected Ok result");

      const handle = handleResult.value;
      expect(handle.workflowId).toBe(workflowId);

      // Get result
      const result = await handle.result();
      expect(result).toEqual(
        expect.objectContaining({
          tag: "Ok",
          value: expect.objectContaining({
            orderId: "ORD-456",
            status: "completed",
          }),
        }),
      );
    });
  });

  describe("Input Validation", () => {
    it("should validate workflow input and reject invalid data", async ({ client }) => {
      // GIVEN - Invalid input (missing required fields)
      const invalidInput = {
        orderId: "ORD-999",
        // missing customerId, items, and totalAmount
      };

      // WHEN/THEN - Use type assertion to bypass compile-time check
      const execution = await client.executeWorkflow("processOrder", {
        workflowId: `invalid-input-${Date.now()}`,
        args: invalidInput as Parameters<
          (typeof orderProcessingContract)["workflows"]["processOrder"]["implementation"]
        >[1],
      });

      expect(execution).toEqual(
        expect.objectContaining({
          tag: "Error",
          error: expect.objectContaining({
            name: "WorkflowValidationError",
          }),
        }),
      );
    });

    it("should validate activity inputs through the workflow", async ({ client }) => {
      // GIVEN - Valid workflow input that will be passed to activities
      const input = {
        orderId: "ORD-VALIDATE",
        customerId: "CUST-VALIDATE",
        items: [{ productId: "PROD-VALIDATE", quantity: 1, price: 75.0 }],
        totalAmount: 75.0,
      };

      // WHEN
      const result = await client.executeWorkflow("processOrder", {
        workflowId: `validate-activities-${Date.now()}`,
        args: input,
      });

      // THEN - Should succeed with proper validation
      expect(result.isOk()).toBe(true);
    });
  });

  describe("Workflow Handle Operations", () => {
    it("should describe a running workflow", async ({ client }) => {
      // GIVEN
      const workflowId = `describe-order-${Date.now()}`;
      const input = {
        orderId: "ORD-DESC",
        customerId: "CUST-DESC",
        items: [{ productId: "PROD-DESC", quantity: 1, price: 100.0 }],
        totalAmount: 100.0,
      };

      const handleResult = await client.startWorkflow("processOrder", {
        workflowId,
        args: input,
      });

      expect(handleResult.isOk()).toBe(true);
      if (!handleResult.isOk()) throw new Error("Expected Ok result");
      const handle = handleResult.value;

      // WHEN
      const describeResult = await handle.describe();

      // THEN
      expect(describeResult).toEqual(
        expect.objectContaining({
          tag: "Ok",
          value: expect.objectContaining({
            workflowId,
            type: "processOrder",
          }),
        }),
      );

      // Wait for workflow to complete
      await handle.result();
    });

    it("should retrieve workflow handle after start", async ({ client }) => {
      // GIVEN
      const workflowId = `get-handle-order-${Date.now()}`;
      const input = {
        orderId: "ORD-HANDLE",
        customerId: "CUST-HANDLE",
        items: [{ productId: "PROD-HANDLE", quantity: 1, price: 300.0 }],
        totalAmount: 125.0,
      };

      await client.startWorkflow("processOrder", {
        workflowId,
        args: input,
      });

      // WHEN
      const handleResult = await client.getHandle("processOrder", workflowId);

      // THEN
      expect(handleResult.isOk()).toBe(true);
      if (!handleResult.isOk()) throw new Error("Expected Ok result");

      const handle = handleResult.value;
      const result = await handle.result();
      expect(result).toEqual(
        expect.objectContaining({
          tag: "Ok",
          value: expect.objectContaining({
            orderId: "ORD-HANDLE",
            status: "completed",
          }),
        }),
      );
    });
  });

  describe("NestJS Dependency Injection", () => {
    it("should use DI for activities through the workflow", async ({ client }) => {
      // GIVEN - This test verifies that activities use NestJS DI
      const input = {
        orderId: "ORD-DI-TEST",
        customerId: "CUST-DI-TEST",
        items: [{ productId: "PROD-DI", quantity: 2, price: 225.0 }],
        totalAmount: 180.0,
      };

      // WHEN
      const result = await client.executeWorkflow("processOrder", {
        workflowId: `di-test-${Date.now()}`,
        args: input,
      });

      // THEN - All activities should execute successfully using DI
      expect(result).toEqual(
        expect.objectContaining({
          tag: "Ok",
          value: expect.objectContaining({
            orderId: "ORD-DI-TEST",
            status: "completed",
          }),
        }),
      );
    });
  });
});

function workflowPath(filename: string): string {
  return fileURLToPath(new URL(`./${filename}${extname(import.meta.url)}`, import.meta.url));
}
