import { describe, expect, vi, beforeEach } from "vitest";
import { Worker } from "@temporalio/worker";
import { TypedClient } from "@temporal-contract/client";
import { it as baseIt } from "@temporal-contract/testing/extension";
import { Future, Result } from "@temporal-contract/boxed";
import { ActivityError } from "@temporal-contract/worker/activity";
import { Injectable } from "@nestjs/common";
import { NestFactory } from "@nestjs/core";
import { extname } from "node:path";
import { fileURLToPath } from "node:url";
import { testNestContract } from "./test.contract.js";
import type { ActivityImplementations } from "@temporal-contract/worker/activity";
import { ActivitiesHandler } from "../activity-handler.js";
import { createActivitiesModule, ACTIVITIES_HANDLER_TOKEN } from "../activity-module.js";

// ============================================================================
// Test Setup
// ============================================================================

const it = baseIt.extend<{
  worker: Worker;
  client: TypedClient<typeof testNestContract>;
}>({
  worker: [
    async ({ workerConnection }, use) => {
      // Create NestJS application context
      const app = await NestFactory.createApplicationContext(TestModule, {
        logger: false,
      });

      const activitiesHandler = app.get(ACTIVITIES_HANDLER_TOKEN);

      // Create and start worker
      const worker = await Worker.create({
        connection: workerConnection,
        namespace: "default",
        taskQueue: testNestContract.taskQueue,
        workflowsPath: workflowPath("test.workflows"),
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
    const client = TypedClient.create(testNestContract, {
      connection: clientConnection,
      namespace: "default",
    });

    await use(client);
  },
});

// ============================================================================
// NestJS Services and Module for Testing
// ============================================================================

// Mock logger service to track messages
const logMessages: string[] = [];

@Injectable()
class LoggerService {
  log(message: string) {
    logMessages.push(message);
  }
}

// Mock payment gateway for dependency injection
@Injectable()
class PaymentGateway {
  async charge(amount: number): Promise<{ transactionId: string; success: boolean }> {
    return {
      transactionId: `TXN-${amount}-${Date.now()}`,
      success: amount > 0,
    };
  }
}

// Activities handler implementing all activities with NestJS DI
@Injectable()
@ActivitiesHandler(testNestContract)
class TestActivitiesHandler implements ActivityImplementations<typeof testNestContract> {
  constructor(
    private readonly logger: LoggerService,
    private readonly paymentGateway: PaymentGateway,
  ) {}

  // Global activities
  logMessage({ message }: { message: string }) {
    this.logger.log(message);
    return Future.value(Result.Ok({}));
  }

  // Workflow-specific activities
  processPayment({ amount }: { amount: number }) {
    return Future.fromPromise(this.paymentGateway.charge(amount)).mapError(
      (error: Error) => new ActivityError("PAYMENT_FAILED", error.message, error),
    );
  }

  validateOrder({ orderId }: { orderId: string }) {
    return Future.value(
      Result.Ok({
        valid: orderId.startsWith("ORD-"),
      }),
    );
  }
}

// Create NestJS module with activities
const TestModule = createActivitiesModule({
  contract: testNestContract,
  handler: TestActivitiesHandler,
  providers: [LoggerService, PaymentGateway],
});

// ============================================================================
// Integration Tests
// ============================================================================

describe("Worker-NestJS Package - Integration Tests", () => {
  beforeEach(() => {
    logMessages.length = 0;
  });

  describe("NestJS Dependency Injection", () => {
    it("should use NestJS DI in activity implementations", async ({ client }) => {
      // GIVEN
      const input = { value: "test-di" };

      // WHEN
      const result = await client.executeWorkflow("simpleWorkflow", {
        workflowId: `di-test-${Date.now()}`,
        args: input,
      });

      // THEN - Activity should have used injected LoggerService
      expect(result).toEqual(
        expect.objectContaining({
          tag: "Ok",
          value: {
            result: "Processed: test-di",
          },
        }),
      );
      expect(logMessages).toContain("Processing: test-di");
    });

    it("should inject services into activities for payment processing", async ({ client }) => {
      // GIVEN
      const input = {
        orderId: "ORD-123",
        amount: 100,
      };

      // WHEN
      const result = await client.executeWorkflow("workflowWithActivities", {
        workflowId: `payment-di-${Date.now()}`,
        args: input,
      });

      // THEN - Should use injected PaymentGateway service
      expect(result).toEqual(
        expect.objectContaining({
          tag: "Ok",
          value: {
            orderId: "ORD-123",
            status: "success",
            transactionId: expect.stringContaining("TXN-100"),
          },
        }),
      );
    });
  });

  describe("Basic Workflow Execution", () => {
    it("should execute a simple workflow successfully", async ({ client }) => {
      // GIVEN
      const input = { value: "test-data" };

      // WHEN
      const result = await client.executeWorkflow("simpleWorkflow", {
        workflowId: `simple-${Date.now()}`,
        args: input,
      });

      // THEN
      expect(result).toEqual(
        expect.objectContaining({
          tag: "Ok",
          value: {
            result: "Processed: test-data",
          },
        }),
      );
      expect(logMessages).toContain("Processing: test-data");
    });

    it("should start workflow and get result separately", async ({ client }) => {
      // GIVEN
      const input = { value: "async-test" };
      const workflowId = `simple-async-${Date.now()}`;

      // WHEN
      const handleResult = await client.startWorkflow("simpleWorkflow", {
        workflowId,
        args: input,
      });

      // THEN
      expect(handleResult.isOk()).toBe(true);
      if (!handleResult.isOk()) throw new Error("Expected Ok result");

      const handle = handleResult.value;
      expect(handle.workflowId).toBe(workflowId);

      const result = await handle.result();
      expect(result).toEqual(
        expect.objectContaining({
          tag: "Ok",
          value: {
            result: "Processed: async-test",
          },
        }),
      );
    });
  });

  describe("Workflow with Activities", () => {
    it("should execute workflow with workflow-specific activities", async ({ client }) => {
      // GIVEN
      const input = {
        orderId: "ORD-456",
        amount: 200,
      };

      // WHEN
      const result = await client.executeWorkflow("workflowWithActivities", {
        workflowId: `order-${Date.now()}`,
        args: input,
      });

      // THEN
      expect(result).toEqual(
        expect.objectContaining({
          tag: "Ok",
          value: {
            orderId: "ORD-456",
            status: "success",
            transactionId: expect.stringContaining("TXN-200"),
          },
        }),
      );
      expect(logMessages).toEqual(
        expect.arrayContaining([
          expect.stringContaining("Order ORD-456 completed with transaction TXN-200"),
        ]),
      );
    });

    it("should handle validation failure in workflow", async ({ client }) => {
      // GIVEN - Invalid order ID (doesn't start with ORD-)
      const input = {
        orderId: "INVALID-123",
        amount: 100,
      };

      // WHEN
      const result = await client.executeWorkflow("workflowWithActivities", {
        workflowId: `order-invalid-${Date.now()}`,
        args: input,
      });

      // THEN
      expect(result).toEqual(
        expect.objectContaining({
          tag: "Ok",
          value: {
            orderId: "INVALID-123",
            status: "failed",
            reason: "Invalid order ID",
          },
        }),
      );
    });

    it("should handle payment failure in workflow", async ({ client }) => {
      // GIVEN - Amount is 0 which causes payment to fail
      const input = {
        orderId: "ORD-789",
        amount: 0,
      };

      // WHEN
      const result = await client.executeWorkflow("workflowWithActivities", {
        workflowId: `order-payment-fail-${Date.now()}`,
        args: input,
      });

      // THEN
      expect(result).toEqual(
        expect.objectContaining({
          tag: "Ok",
          value: {
            orderId: "ORD-789",
            status: "failed",
            reason: "Payment failed",
          },
        }),
      );
    });
  });

  describe("Signals, Queries, and Updates", () => {
    it("should send signal to workflow and modify state", async ({ client }) => {
      // GIVEN
      const workflowId = `signal-test-${Date.now()}`;
      const handleResult = await client.startWorkflow("interactiveWorkflow", {
        workflowId,
        args: { initialValue: 10 },
      });

      expect(handleResult.isOk()).toBe(true);
      if (!handleResult.isOk()) throw new Error("Expected Ok result");
      const handle = handleResult.value;

      // WHEN - Send signals to increment value
      await handle.signals.increment({ amount: 5 });
      await handle.signals.increment({ amount: 3 });

      // THEN - Workflow should complete with updated value
      const result = await handle.result();
      expect(result).toEqual(
        expect.objectContaining({
          tag: "Ok",
          value: {
            finalValue: 18, // 10 + 5 + 3
          },
        }),
      );
    });

    it("should query workflow state", async ({ client }) => {
      // GIVEN - Start workflow with sleep to allow time for query
      const workflowId = `query-test-${Date.now()}`;
      const handleResult = await client.startWorkflow("interactiveWorkflow", {
        workflowId,
        args: { initialValue: 42 },
      });

      expect(handleResult.isOk()).toBe(true);
      if (!handleResult.isOk()) throw new Error("Expected Ok result");
      const handle = handleResult.value;

      // WHEN - Query the current value
      const queryResult = await handle.queries.getCurrentValue({});

      // THEN - Should return current value
      expect(queryResult).toEqual(
        expect.objectContaining({
          tag: "Ok",
          value: {
            value: 42,
          },
        }),
      );

      // Wait for workflow to complete
      await handle.result();
    });

    it("should send update to workflow and get returned value", async ({ client }) => {
      // GIVEN
      const workflowId = `update-test-${Date.now()}`;
      const handleResult = await client.startWorkflow("interactiveWorkflow", {
        workflowId,
        args: { initialValue: 5 },
      });

      expect(handleResult.isOk()).toBe(true);
      if (!handleResult.isOk()) throw new Error("Expected Ok result");
      const handle = handleResult.value;

      // WHEN - Send update to multiply value
      const updateResult = await handle.updates.multiply({ factor: 3 });

      // THEN - Update should return the new value
      expect(updateResult).toEqual(
        expect.objectContaining({
          tag: "Ok",
          value: {
            newValue: 15, // 5 * 3
          },
        }),
      );

      // Workflow should complete with the multiplied value
      const result = await handle.result();
      expect(result).toEqual(
        expect.objectContaining({
          tag: "Ok",
          value: {
            finalValue: 15,
          },
        }),
      );
    });
  });

  describe("Input/Output Validation", () => {
    it("should validate workflow input and reject invalid data", async ({ client }) => {
      // GIVEN - Invalid input (missing required field)
      const invalidInput = {
        // missing 'value' field
      };

      // WHEN/THEN - Use type assertion to bypass compile-time check for runtime validation test
      const execution = await client.executeWorkflow("simpleWorkflow", {
        workflowId: `invalid-input-${Date.now()}`,
        args: invalidInput as { value: string },
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
  });
});

function workflowPath(filename: string): string {
  return fileURLToPath(new URL(`./${filename}${extname(import.meta.url)}`, import.meta.url));
}
