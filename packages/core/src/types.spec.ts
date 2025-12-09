import { describe, expect, it } from "vitest";
import { z } from "zod";
import type {
  ActivityDefinition,
  ContractDefinition,
  InferActivity,
  InferInput,
  InferOutput,
  InferQuery,
  InferSignal,
  InferUpdate,
  InferWorkflow,
  QueryDefinition,
  SignalDefinition,
  UpdateDefinition,
  WorkflowDefinition,
} from "./types.js";

describe("Core Types", () => {
  describe("ActivityDefinition", () => {
    it("should correctly define an activity", () => {
      const activityDef: ActivityDefinition = {
        input: z.object({ orderId: z.string() }),
        output: z.object({ success: z.boolean() }),
      };

      expect(activityDef.input).toBeDefined();
      expect(activityDef.output).toBeDefined();
    });

    it("should infer correct input type", () => {
      const activityDef = {
        input: z.object({ orderId: z.string(), amount: z.number() }),
        output: z.object({ transactionId: z.string() }),
      } satisfies ActivityDefinition;

      type Input = InferInput<typeof activityDef>;
      const input: Input = { orderId: "123", amount: 100 };

      expect(input.orderId).toBe("123");
      expect(input.amount).toBe(100);
    });

    it("should infer correct output type", () => {
      const activityDef = {
        input: z.object({ orderId: z.string() }),
        output: z.object({ success: z.boolean(), transactionId: z.string() }),
      } satisfies ActivityDefinition;

      type Output = InferOutput<typeof activityDef>;
      const output: Output = { success: true, transactionId: "tx-123" };

      expect(output.success).toBe(true);
      expect(output.transactionId).toBe("tx-123");
    });
  });

  describe("SignalDefinition", () => {
    it("should correctly define a signal", () => {
      const signalDef: SignalDefinition = {
        input: z.object({ reason: z.string() }),
      };

      expect(signalDef.input).toBeDefined();
    });

    it("should infer correct signal handler type", () => {
      const signalDef = {
        input: z.object({ itemId: z.string(), quantity: z.number() }),
      } satisfies SignalDefinition;

      type Handler = InferSignal<typeof signalDef>;
      const handler: Handler = (args) => {
        expect(args.itemId).toBeDefined();
        expect(args.quantity).toBeDefined();
      };

      handler({ itemId: "item-1", quantity: 5 });
    });
  });

  describe("QueryDefinition", () => {
    it("should correctly define a query", () => {
      const queryDef: QueryDefinition = {
        input: z.object({ detailed: z.boolean() }),
        output: z.object({ status: z.string() }),
      };

      expect(queryDef.input).toBeDefined();
      expect(queryDef.output).toBeDefined();
    });

    it("should infer correct query handler type", () => {
      const queryDef = {
        input: z.object({}),
        output: z.object({ status: z.string(), progress: z.number() }),
      } satisfies QueryDefinition;

      type Handler = InferQuery<typeof queryDef>;
      const handler: Handler = async (_args) => {
        return { status: "running", progress: 50 };
      };

      expect(handler({})).resolves.toEqual({ status: "running", progress: 50 });
    });
  });

  describe("UpdateDefinition", () => {
    it("should correctly define an update", () => {
      const updateDef: UpdateDefinition = {
        input: z.object({ discount: z.number() }),
        output: z.object({ newTotal: z.number() }),
      };

      expect(updateDef.input).toBeDefined();
      expect(updateDef.output).toBeDefined();
    });

    it("should infer correct update handler type", () => {
      const updateDef = {
        input: z.object({ percentage: z.number() }),
        output: z.object({ applied: z.boolean(), newAmount: z.number() }),
      } satisfies UpdateDefinition;

      type Handler = InferUpdate<typeof updateDef>;
      const handler: Handler = async (args) => {
        return { applied: true, newAmount: 100 * (1 - args.percentage / 100) };
      };

      expect(handler({ percentage: 10 })).resolves.toEqual({
        applied: true,
        newAmount: 90,
      });
    });
  });

  describe("WorkflowDefinition", () => {
    it("should correctly define a workflow", () => {
      const workflowDef: WorkflowDefinition = {
        input: z.object({ orderId: z.string() }),
        output: z.object({ status: z.string() }),
        activities: {
          processPayment: {
            input: z.object({ amount: z.number() }),
            output: z.object({ success: z.boolean() }),
          },
        },
      };

      expect(workflowDef.input).toBeDefined();
      expect(workflowDef.output).toBeDefined();
      expect(workflowDef.activities).toBeDefined();
    });

    it("should support optional signals, queries, and updates", () => {
      const workflowDef: WorkflowDefinition = {
        input: z.object({ orderId: z.string() }),
        output: z.object({ status: z.string() }),
        signals: {
          cancel: {
            input: z.object({ reason: z.string() }),
          },
        },
        queries: {
          getStatus: {
            input: z.object({}),
            output: z.object({ status: z.string() }),
          },
        },
        updates: {
          updateDiscount: {
            input: z.object({ discount: z.number() }),
            output: z.object({ newTotal: z.number() }),
          },
        },
      };

      expect(workflowDef.signals).toBeDefined();
      expect(workflowDef.queries).toBeDefined();
      expect(workflowDef.updates).toBeDefined();
    });

    it("should infer correct workflow function type", () => {
      const workflowDef = {
        input: z.object({ orderId: z.string(), customerId: z.string() }),
        output: z.object({ status: z.string(), total: z.number() }),
      } satisfies WorkflowDefinition;

      type WorkflowFn = InferWorkflow<typeof workflowDef>;
      const workflow: WorkflowFn = async (args) => {
        expect(args.orderId).toBeDefined();
        expect(args.customerId).toBeDefined();
        return { status: "completed", total: 100 };
      };

      expect(workflow({ orderId: "123", customerId: "456" })).resolves.toEqual({
        status: "completed",
        total: 100,
      });
    });
  });

  describe("ContractDefinition", () => {
    it("should correctly define a contract", () => {
      const contractDef: ContractDefinition = {
        taskQueue: "test-queue",
        workflows: {
          processOrder: {
            input: z.object({ orderId: z.string() }),
            output: z.object({ status: z.string() }),
          },
        },
        activities: {
          sendEmail: {
            input: z.object({ to: z.string(), subject: z.string() }),
            output: z.object({ sent: z.boolean() }),
          },
        },
      };

      expect(contractDef.taskQueue).toBe("test-queue");
      expect(contractDef.workflows).toBeDefined();
      expect(contractDef.activities).toBeDefined();
    });

    it("should support optional activities", () => {
      const contractDef: ContractDefinition = {
        taskQueue: "test-queue",
        workflows: {
          simpleWorkflow: {
            input: z.object({ value: z.string() }),
            output: z.object({ result: z.string() }),
          },
        },
      };

      expect(contractDef.taskQueue).toBe("test-queue");
      expect(contractDef.workflows).toBeDefined();
      expect(contractDef.activities).toBeUndefined();
    });
  });

  describe("InferActivity", () => {
    it("should correctly infer activity function signature", () => {
      const activityDef = {
        input: z.object({ orderId: z.string(), amount: z.number() }),
        output: z.object({ transactionId: z.string(), success: z.boolean() }),
      } satisfies ActivityDefinition;

      type ActivityFn = InferActivity<typeof activityDef>;
      const activity: ActivityFn = async (args) => {
        expect(args.orderId).toBeDefined();
        expect(args.amount).toBeDefined();
        return { transactionId: "tx-123", success: true };
      };

      expect(activity({ orderId: "123", amount: 100 })).resolves.toEqual({
        transactionId: "tx-123",
        success: true,
      });
    });
  });
});
