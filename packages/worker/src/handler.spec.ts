import { describe, expect, it, vi } from "vitest";
import { z } from "zod";
import { declareActivitiesHandler, declareWorkflow } from "./handler.js";
import type { ActivityImplementations } from "./handler.js";
import type { ContractDefinition, WorkflowDefinition } from "@temporal-contract/contract";
import {
  ActivityDefinitionNotFoundError,
  ActivityInputValidationError,
  ActivityOutputValidationError,
  WorkflowInputValidationError,
  WorkflowOutputValidationError,
} from "./errors.js";

// Mock Temporal workflow functions
vi.mock("@temporalio/workflow", () => ({
  proxyActivities: vi.fn(() => ({})),
  workflowInfo: vi.fn(() => ({
    workflowId: "test-workflow",
    runId: "test-run",
    workflowType: "testWorkflow",
    namespace: "default",
    taskQueue: "test-queue",
  })),
  setHandler: vi.fn(),
  defineSignal: vi.fn((name) => ({ name, type: "signal" })),
  defineQuery: vi.fn((name) => ({ name, type: "query" })),
  defineUpdate: vi.fn((name) => ({ name, type: "update" })),
}));

describe("Worker Package", () => {
  describe("declareActivitiesHandler", () => {
    it("should create an activities handler with validation", () => {
      const contract = {
        taskQueue: "test-queue",
        workflows: {
          testWorkflow: {
            input: z.object({ value: z.string() }),
            output: z.object({ result: z.string() }),
          },
        },
        activities: {
          sendEmail: {
            input: z.object({ to: z.string(), subject: z.string(), body: z.string() }),
            output: z.object({ sent: z.boolean() }),
          },
        },
      } satisfies ContractDefinition;

      const handler = declareActivitiesHandler({
        contract,
        activities: {
          sendEmail: async (args) => {
            expect(args.to).toBeDefined();
            return { sent: true };
          },
        },
      });

      expect(handler.contract).toBe(contract);
      expect(handler.activities["sendEmail"]).toBeDefined();
      expect(typeof handler.activities["sendEmail"]).toBe("function");
    });

    it("should validate activity input with Zod", async () => {
      const contract = {
        taskQueue: "test-queue",
        workflows: {},
        activities: {
          processPayment: {
            input: z.object({ amount: z.number(), currency: z.string() }),
            output: z.object({ transactionId: z.string() }),
          },
        },
      } satisfies ContractDefinition;

      const handler = declareActivitiesHandler({
        contract,
        activities: {
          processPayment: async (args) => {
            return { transactionId: `tx-${args.amount}` };
          },
        },
      });

      // Valid input should work - Temporal passes as array
      const result = await handler.activities["processPayment"]!({ amount: 100, currency: "USD" });
      expect(result).toEqual(expect.objectContaining({ transactionId: "tx-100" }));

      // Invalid input should throw
      await expect(
        handler.activities["processPayment"]!({ amount: "invalid" as unknown, currency: "USD" }),
      ).rejects.toThrow();
    });

    it("should validate activity output with Zod", async () => {
      const contract = {
        taskQueue: "test-queue",
        workflows: {},
        activities: {
          fetchData: {
            input: z.object({ id: z.string() }),
            output: z.object({ data: z.string(), timestamp: z.number() }),
          },
        },
      } satisfies ContractDefinition;

      const handler = declareActivitiesHandler({
        contract,
        activities: {
          fetchData: async (_args): Promise<{ data: string; timestamp: number }> => {
            return { data: "test", timestamp: "invalid" as unknown as number };
          },
        },
      });

      // Invalid output should throw
      await expect(handler.activities["fetchData"]!({ id: "123" })).rejects.toThrow();
    });

    it("should handle workflow-specific activities", () => {
      const contract = {
        taskQueue: "test-queue",
        workflows: {
          processOrder: {
            input: z.object({ orderId: z.string() }),
            output: z.object({ status: z.string() }),
            activities: {
              validateInventory: {
                input: z.object({ orderId: z.string() }),
                output: z.object({ available: z.boolean() }),
              },
            },
          },
        },
      } satisfies ContractDefinition;

      const handler = declareActivitiesHandler({
        contract,
        activities: {
          validateInventory: async (_args) => {
            return { available: true };
          },
        },
      });

      expect(handler.activities["validateInventory"]).toBeDefined();
    });
  });

  describe("declareWorkflow", () => {
    const testWorkflowDef = {
      input: z.object({ orderId: z.string(), amount: z.number() }),
      output: z.object({ status: z.string(), total: z.number() }),
    } satisfies WorkflowDefinition;

    const testContract = {
      taskQueue: "test-queue",
      workflows: {
        processOrder: testWorkflowDef,
      },
    } satisfies ContractDefinition;

    it("should create a workflow with validation", () => {
      const workflow = declareWorkflow({
        definition: testWorkflowDef,
        contract: testContract,
        implementation: async (_context, args) => {
          return { status: "completed", total: args.amount };
        },
      });

      expect(workflow).toBeDefined();
      expect(typeof workflow).toBe("function");
    });

    it("should validate workflow input", async () => {
      const workflow = declareWorkflow({
        definition: testWorkflowDef,
        contract: testContract,
        implementation: async (_context, args) => {
          return { status: "completed", total: args.amount };
        },
      });

      // Valid input (Temporal passes as array)
      const result = await workflow([{ orderId: "123", amount: 100 }] as unknown as {
        orderId: string;
        amount: number;
      });
      expect(result).toEqual(expect.objectContaining({ status: "completed", total: 100 }));

      // Invalid input should throw
      await expect(
        workflow([{ orderId: 123, amount: "invalid" }] as unknown as {
          orderId: string;
          amount: number;
        }),
      ).rejects.toThrow();
    });

    it("should validate workflow output", async () => {
      const workflow = declareWorkflow({
        definition: testWorkflowDef,
        contract: testContract,
        implementation: async (_context, _args): Promise<{ status: string; total: number }> => {
          return { status: "completed", total: "invalid" } as unknown as {
            status: string;
            total: number;
          };
        },
      });

      await expect(
        workflow([{ orderId: "123", amount: 100 }] as unknown as {
          orderId: string;
          amount: number;
        }),
      ).rejects.toThrow();
    });

    it("should register signal handlers", async () => {
      const workflowDef = {
        ...testWorkflowDef,
        signals: {
          cancel: {
            input: z.object({ reason: z.string() }),
          },
        },
      } satisfies WorkflowDefinition;

      const cancelHandler = vi.fn();

      const contractWithSignals = {
        taskQueue: "test-queue",
        workflows: {
          processOrder: workflowDef,
        },
      } satisfies ContractDefinition;

      const workflow = declareWorkflow({
        definition: workflowDef,
        contract: contractWithSignals,
        implementation: async (_context, args) => {
          return { status: "completed", total: args.amount };
        },
        signals: {
          cancel: cancelHandler,
        },
      });

      expect(workflow).toBeDefined();
    });

    it("should support query handlers", () => {
      const workflowDef = {
        ...testWorkflowDef,
        queries: {
          getStatus: {
            input: z.object({}),
            output: z.object({ status: z.string(), progress: z.number() }),
          },
        },
      } satisfies WorkflowDefinition;

      const queryHandler = vi.fn().mockReturnValue({ status: "running", progress: 50 });

      const contractWithQueries = {
        taskQueue: "test-queue",
        workflows: {
          processOrder: workflowDef,
        },
      } satisfies ContractDefinition;

      const workflow = declareWorkflow({
        definition: workflowDef,
        contract: contractWithQueries,
        implementation: async (_context, args) => {
          return { status: "completed", total: args.amount };
        },
        queries: {
          getStatus: queryHandler,
        },
      });

      expect(workflow).toBeDefined();
    });

    it("should support update handlers", () => {
      const workflowDef = {
        ...testWorkflowDef,
        updates: {
          updateDiscount: {
            input: z.object({ percentage: z.number() }),
            output: z.object({ newTotal: z.number() }),
          },
        },
      } satisfies WorkflowDefinition;

      const updateHandler = vi.fn().mockResolvedValue({ newTotal: 90 });

      const contractWithUpdates = {
        taskQueue: "test-queue",
        workflows: {
          processOrder: workflowDef,
        },
      } satisfies ContractDefinition;

      const workflow = declareWorkflow({
        definition: workflowDef,
        contract: contractWithUpdates,
        implementation: async (_context, args) => {
          return { status: "completed", total: args.amount };
        },
        updates: {
          updateDiscount: updateHandler,
        },
      });

      expect(workflow).toBeDefined();
    });

    it("should handle single parameter (not array)", async () => {
      const workflow = declareWorkflow({
        definition: testWorkflowDef,
        contract: testContract,
        implementation: async (_context, args) => {
          expect(args.orderId).toBe("123");
          expect(args.amount).toBe(100);
          return { status: "completed", total: args.amount };
        },
      });

      // Single parameter (should extract from array)
      await workflow([{ orderId: "123", amount: 100 }] as unknown as {
        orderId: string;
        amount: number;
      });
    });
  });

  describe("Error Handling", () => {
    it("should throw ActivityDefinitionNotFoundError with available definitions", () => {
      const contract = {
        taskQueue: "test-queue",
        workflows: {},
        activities: {
          sendEmail: {
            input: z.object({ to: z.string() }),
            output: z.object({ sent: z.boolean() }),
          },
          processPayment: {
            input: z.object({ amount: z.number() }),
            output: z.object({ transactionId: z.string() }),
          },
        },
      } satisfies ContractDefinition;

      const testActivities = {
        sendEmail: async () => ({ sent: true }),
        unknownActivity: async () => ({ result: true }), // Activity not in contract
      };

      expect(() => {
        declareActivitiesHandler({
          contract,
          activities: testActivities as unknown as ActivityImplementations<typeof contract>,
        });
      }).toThrow(ActivityDefinitionNotFoundError);

      try {
        declareActivitiesHandler({
          contract,
          activities: testActivities as unknown as ActivityImplementations<typeof contract>,
        });
      } catch (error) {
        if (error instanceof ActivityDefinitionNotFoundError) {
          expect(error.activityName).toBe("unknownActivity");
          expect(error.availableDefinitions).toEqual(["sendEmail", "processPayment"]);
          expect(error.message).toContain("unknownActivity");
          expect(error.message).toContain("sendEmail");
        }
      }
    });

    it("should throw ActivityInputValidationError with Zod details", async () => {
      const contract = {
        taskQueue: "test-queue",
        workflows: {},
        activities: {
          processPayment: {
            input: z.object({ amount: z.number().positive(), currency: z.string() }),
            output: z.object({ transactionId: z.string() }),
          },
        },
      } satisfies ContractDefinition;

      const handler = declareActivitiesHandler({
        contract,
        activities: {
          processPayment: async (args) => {
            return { transactionId: `tx-${args.amount}` };
          },
        },
      });

      try {
        await handler.activities["processPayment"]!({
          amount: -100,
          currency: "USD",
        });
      } catch (error) {
        if (error instanceof ActivityInputValidationError) {
          expect(error.activityName).toBe("processPayment");
          expect(error.zodError).toBeDefined();
          expect(error.message).toContain("processPayment");
          expect(error.message).toContain("input validation failed");
        }
      }
    });

    it("should throw ActivityOutputValidationError with Zod details", async () => {
      const contract = {
        taskQueue: "test-queue",
        workflows: {},
        activities: {
          fetchData: {
            input: z.object({ id: z.string() }),
            output: z.object({ data: z.string(), timestamp: z.number() }),
          },
        },
      } satisfies ContractDefinition;

      const handler = declareActivitiesHandler({
        contract,
        activities: {
          fetchData: async (): Promise<{ data: string; timestamp: number }> => {
            return { data: "test", timestamp: "invalid" as unknown as number };
          },
        },
      });

      try {
        await handler.activities["fetchData"]!({ id: "123" });
      } catch (error) {
        if (error instanceof ActivityOutputValidationError) {
          expect(error.activityName).toBe("fetchData");
          expect(error.zodError).toBeDefined();
          expect(error.message).toContain("fetchData");
          expect(error.message).toContain("output validation failed");
        }
      }
    });

    it("should throw WorkflowInputValidationError", async () => {
      const workflowDef = {
        input: z.object({ orderId: z.string().uuid(), amount: z.number().positive() }),
        output: z.object({ status: z.string() }),
      } satisfies WorkflowDefinition;

      const contract = {
        taskQueue: "test-queue",
        workflows: {
          processOrder: workflowDef,
        },
      } satisfies ContractDefinition;

      const workflow = declareWorkflow({
        definition: workflowDef,
        contract: contract,
        implementation: async () => {
          return { status: "completed" };
        },
      });

      try {
        await workflow([{ orderId: "not-a-uuid", amount: 100 }] as unknown as {
          orderId: string;
          amount: number;
        });
      } catch (error) {
        if (error instanceof WorkflowInputValidationError) {
          expect(error.workflowName).toBe(String(workflowDef));
          expect(error.zodError).toBeDefined();
          expect(error.message).toContain("input validation failed");
        }
      }
    });

    it("should throw WorkflowOutputValidationError", async () => {
      const workflowDef = {
        input: z.object({ orderId: z.string() }),
        output: z.object({ status: z.enum(["completed", "failed", "pending"]), total: z.number() }),
      } satisfies WorkflowDefinition;

      const contract = {
        taskQueue: "test-queue",
        workflows: {
          processOrder: workflowDef,
        },
      } satisfies ContractDefinition;

      const workflow = declareWorkflow({
        definition: workflowDef,
        contract: contract,
        implementation: async () => {
          // Return invalid status to trigger validation error
          return { status: "invalid-status", total: 100 } as unknown as {
            status: "completed" | "failed" | "pending";
            total: number;
          };
        },
      });

      try {
        await workflow([{ orderId: "123" }] as unknown as { orderId: string });
      } catch (error) {
        if (error instanceof WorkflowOutputValidationError) {
          expect(error.workflowName).toBe(String(workflowDef));
          expect(error.zodError).toBeDefined();
          expect(error.message).toContain("output validation failed");
        }
      }
    });
  });
});
