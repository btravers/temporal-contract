import { describe, expect, vi, beforeEach } from "vitest";
import { Worker } from "@temporalio/worker";
import { TypedClient } from "@temporal-contract/client";
import { it as baseIt } from "@temporal-contract/testing/extension";
import { Future, Result } from "@temporal-contract/boxed";
import { declareActivitiesHandler, ActivityError } from "../handler.js";
import { extname } from "node:path";
import { fileURLToPath } from "node:url";
import { testContract } from "./test.contract.js";

// ============================================================================
// Test Setup
// ============================================================================

const it = baseIt.extend<{
  worker: Worker;
  client: TypedClient<typeof testContract>;
}>({
  worker: [
    async ({ workerConnection }, use) => {
      // Create and start worker
      const worker = await Worker.create({
        connection: workerConnection,
        namespace: "default",
        taskQueue: testContract.taskQueue,
        workflowsPath: workflowPath("test.workflows"),
        activities: testActivitiesHandler.activities,
      });

      // Start worker in background
      worker.run().catch((err) => {
        console.error("Worker failed:", err);
      });

      await vi.waitFor(() => worker.getState() === "RUNNING", { interval: 100 });

      await use(worker);

      await worker.shutdown();

      await vi.waitFor(() => worker.getState() === "STOPPED", { interval: 100 });
    },
    { auto: true },
  ],
  client: async ({ clientConnection }, use) => {
    // Create typed client
    const client = TypedClient.create(testContract, {
      connection: clientConnection,
      namespace: "default",
    });

    await use(client);
  },
});

// ============================================================================
// Mock implementations for activities
// ============================================================================

const logMessages: string[] = [];

const testActivitiesHandler = declareActivitiesHandler({
  contract: testContract,
  activities: {
    // Global activities
    logMessage: ({ message }) => {
      logMessages.push(message);
      return Future.value(Result.Ok({}));
    },

    failableActivity: ({ shouldFail }) => {
      if (shouldFail) {
        return Future.value(
          Result.Error(
            new ActivityError("ACTIVITY_FAILED", "Activity was configured to fail", {
              shouldFail: true,
            }),
          ),
        );
      }
      return Future.value(Result.Ok({ success: true }));
    },

    // Workflow-specific activities
    processPayment: ({ amount }) => {
      return Future.value(
        Result.Ok({
          transactionId: `TXN-${amount}-${Date.now()}`,
          success: amount > 0,
        }),
      );
    },

    validateOrder: ({ orderId }) => {
      return Future.value(
        Result.Ok({
          valid: orderId.startsWith("ORD-"),
        }),
      );
    },
  },
});

// ============================================================================
// Integration Tests
// ============================================================================

describe("Worker Package - Integration Tests", () => {
  beforeEach(() => {
    logMessages.length = 0;
  });

  describe("Basic Workflow Execution", () => {
    it("should execute a simple workflow successfully", async ({ client }) => {
      // GIVEN
      const input = { value: "test-data" };

      // WHEN
      const result = await client
        .executeWorkflow("simpleWorkflow", {
          workflowId: `simple-${Date.now()}`,
          args: input,
        })
        .toPromise();

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
      const handleResult = await client
        .startWorkflow("simpleWorkflow", {
          workflowId,
          args: input,
        })
        .toPromise();

      // THEN
      expect(handleResult.isOk()).toBe(true);
      if (!handleResult.isOk()) throw new Error("Expected Ok result");

      const handle = handleResult.value;
      expect(handle.workflowId).toBe(workflowId);

      const result = await handle.result().toPromise();
      expect(result).toEqual(
        expect.objectContaining({
          tag: "Ok",
          value: {
            result: "Processed: async-test",
          },
        }),
      );
    });

    it("should retrieve workflow handle after start", async ({ client }) => {
      // GIVEN
      const input = { value: "get-handle-test" };
      const workflowId = `simple-handle-${Date.now()}`;

      await client
        .startWorkflow("simpleWorkflow", {
          workflowId,
          args: input,
        })
        .toPromise();

      // WHEN
      const handleResult = await client.getHandle("simpleWorkflow", workflowId).toPromise();

      // THEN
      expect(handleResult.isOk()).toBe(true);
      if (!handleResult.isOk()) throw new Error("Expected Ok result");

      const handle = handleResult.value;
      const result = await handle.result().toPromise();
      expect(result).toEqual(
        expect.objectContaining({
          tag: "Ok",
          value: {
            result: "Processed: get-handle-test",
          },
        }),
      );
    });
  });

  describe("Workflow with Activities", () => {
    it("should execute workflow with workflow-specific activities", async ({ client }) => {
      // GIVEN
      const input = {
        orderId: "ORD-123",
        amount: 100,
      };

      // WHEN
      const result = await client
        .executeWorkflow("workflowWithActivities", {
          workflowId: `order-${Date.now()}`,
          args: input,
        })
        .toPromise();

      // THEN
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
      expect(logMessages).toEqual(
        expect.arrayContaining([
          expect.stringContaining("Order ORD-123 completed with transaction TXN-100"),
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
      const result = await client
        .executeWorkflow("workflowWithActivities", {
          workflowId: `order-invalid-${Date.now()}`,
          args: input,
        })
        .toPromise();

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
        orderId: "ORD-456",
        amount: 0,
      };

      // WHEN
      const result = await client
        .executeWorkflow("workflowWithActivities", {
          workflowId: `order-payment-fail-${Date.now()}`,
          args: input,
        })
        .toPromise();

      // THEN
      expect(result).toEqual(
        expect.objectContaining({
          tag: "Ok",
          value: {
            orderId: "ORD-456",
            status: "failed",
            reason: "Payment failed",
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
      const execution = client.executeWorkflow("simpleWorkflow", {
        workflowId: `invalid-input-${Date.now()}`,
        args: invalidInput as { value: string },
      });

      await expect(execution).rejects.toThrow();
    });

    it("should validate activity input", async ({ client }) => {
      // This test verifies that activity input validation happens at runtime
      // by using a workflow that calls activities with the data passed to it

      // GIVEN - Valid workflow input that will be passed to activities
      const input = {
        orderId: "ORD-789",
        amount: 50,
      };

      // WHEN
      const result = await client
        .executeWorkflow("workflowWithActivities", {
          workflowId: `validate-activity-${Date.now()}`,
          args: input,
        })
        .toPromise();

      // THEN - Should succeed with proper validation
      expect(result.isOk()).toBe(true);
    });
  });

  describe("Child Workflows", () => {
    it("should execute child workflows from parent", async ({ client }) => {
      // GIVEN
      const input = { count: 3 };

      // WHEN
      const result = await client
        .executeWorkflow("parentWorkflow", {
          workflowId: `parent-${Date.now()}`,
          args: input,
        })
        .toPromise();

      // THEN
      expect(result).toEqual(
        expect.objectContaining({
          tag: "Ok",
          value: {
            results: ["Child 0 completed", "Child 1 completed", "Child 2 completed"],
          },
        }),
      );

      // Check that child workflows logged
      expect(logMessages).toEqual(
        expect.arrayContaining([
          "Child workflow 0 running",
          "Child workflow 1 running",
          "Child workflow 2 running",
        ]),
      );
    });
  });

  describe("Signals, Queries, and Updates", () => {
    it("should send signal to workflow and modify state", async ({ client }) => {
      // GIVEN
      const workflowId = `signal-test-${Date.now()}`;
      const handleResult = await client
        .startWorkflow("interactiveWorkflow", {
          workflowId,
          args: { initialValue: 10 },
        })
        .toPromise();

      expect(handleResult.isOk()).toBe(true);
      if (!handleResult.isOk()) throw new Error("Expected Ok result");
      const handle = handleResult.value;

      // WHEN - Send signals to increment value
      await handle.signals.increment({ amount: 5 }).toPromise();
      await handle.signals.increment({ amount: 3 }).toPromise();

      // THEN - Workflow should complete with updated value
      const result = await handle.result().toPromise();
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
      const handleResult = await client
        .startWorkflow("interactiveWorkflow", {
          workflowId,
          args: { initialValue: 42 },
        })
        .toPromise();

      expect(handleResult.isOk()).toBe(true);
      if (!handleResult.isOk()) throw new Error("Expected Ok result");
      const handle = handleResult.value;

      // WHEN - Query the current value
      const queryResult = await handle.queries.getCurrentValue({}).toPromise();

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
      await handle.result().toPromise();
    });

    it("should send update to workflow and get returned value", async ({ client }) => {
      // GIVEN
      const workflowId = `update-test-${Date.now()}`;
      const handleResult = await client
        .startWorkflow("interactiveWorkflow", {
          workflowId,
          args: { initialValue: 5 },
        })
        .toPromise();

      expect(handleResult.isOk()).toBe(true);
      if (!handleResult.isOk()) throw new Error("Expected Ok result");
      const handle = handleResult.value;

      // WHEN - Send update to multiply value
      const updateResult = await handle.updates.multiply({ factor: 3 }).toPromise();

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
      const result = await handle.result().toPromise();
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

  describe("Workflow Description", () => {
    it("should describe a running workflow", async ({ client }) => {
      // GIVEN
      const workflowId = `describe-test-${Date.now()}`;
      const handleResult = await client
        .startWorkflow("simpleWorkflow", {
          workflowId,
          args: { value: "describe-me" },
        })
        .toPromise();

      expect(handleResult.isOk()).toBe(true);
      if (!handleResult.isOk()) throw new Error("Expected Ok result");
      const handle = handleResult.value;

      // WHEN
      const describeResult = await handle.describe().toPromise();

      // THEN
      expect(describeResult).toEqual(
        expect.objectContaining({
          tag: "Ok",
          value: expect.objectContaining({
            workflowId,
            type: "simpleWorkflow",
          }),
        }),
      );

      // Wait for workflow to complete
      await handle.result().toPromise();
    });
  });

  describe("Error Handling", () => {
    it("should propagate ActivityError from activity to workflow", async ({ client }) => {
      // GIVEN
      const input = { shouldFail: true };

      // WHEN
      const result = await client
        .executeWorkflow("workflowWithFailableActivity", {
          workflowId: `error-handling-${Date.now()}`,
          args: input,
        })
        .toPromise();

      // THEN
      expect(result.isError()).toBe(true);
      if (result.isOk()) throw new Error("Expected error result");
      const error = result.error;
      expect(error).toBeInstanceOf(ActivityError);
      expect(error.message).toMatch(/failableActivity failed/);
    });
  });
});

function workflowPath(filename: string): string {
  return fileURLToPath(new URL(`./${filename}${extname(import.meta.url)}`, import.meta.url));
}
