import { describe, expect, it } from "vitest";
import { z } from "zod";
import type {
  ActivityDefinition,
  ContractDefinition,
  QueryDefinition,
  SignalDefinition,
  UpdateDefinition,
  WorkflowDefinition,
  InferWorkflowNames,
  InferActivityNames,
  InferContractWorkflows,
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
  });

  describe("SignalDefinition", () => {
    it("should correctly define a signal", () => {
      const signalDef: SignalDefinition = {
        input: z.object({ reason: z.string() }),
      };

      expect(signalDef.input).toBeDefined();
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
  });

  describe("UpdateDefinition", () => {
    it("should correctly define an update", () => {
      const updateDef: UpdateDefinition = {
        input: z.object({ newValue: z.number() }),
        output: z.object({ updated: z.boolean() }),
      };

      expect(updateDef.input).toBeDefined();
      expect(updateDef.output).toBeDefined();
    });
  });

  describe("WorkflowDefinition", () => {
    it("should correctly define a workflow with activities", () => {
      const workflowDef: WorkflowDefinition = {
        input: z.object({ orderId: z.string() }),
        output: z.object({ success: z.boolean() }),
        activities: {
          processPayment: {
            input: z.object({ amount: z.number() }),
            output: z.object({ transactionId: z.string() }),
          },
        },
      };

      expect(workflowDef.input).toBeDefined();
      expect(workflowDef.output).toBeDefined();
      expect(workflowDef.activities).toBeDefined();
    });

    it("should correctly define a workflow with signals", () => {
      const workflowDef: WorkflowDefinition = {
        input: z.object({ orderId: z.string() }),
        output: z.object({ success: z.boolean() }),
        signals: {
          cancel: {
            input: z.object({ reason: z.string() }),
          },
        },
      };

      expect(workflowDef.signals).toBeDefined();
    });

    it("should correctly define a workflow with queries", () => {
      const workflowDef: WorkflowDefinition = {
        input: z.object({ orderId: z.string() }),
        output: z.object({ success: z.boolean() }),
        queries: {
          getStatus: {
            input: z.object({ detailed: z.boolean() }),
            output: z.object({ status: z.string() }),
          },
        },
      };

      expect(workflowDef.queries).toBeDefined();
    });

    it("should correctly define a workflow with updates", () => {
      const workflowDef: WorkflowDefinition = {
        input: z.object({ orderId: z.string() }),
        output: z.object({ success: z.boolean() }),
        updates: {
          changeQuantity: {
            input: z.object({ quantity: z.number() }),
            output: z.object({ updated: z.boolean() }),
          },
        },
      };

      expect(workflowDef.updates).toBeDefined();
    });
  });

  describe("ContractDefinition", () => {
    it("should correctly define a contract with workflows", () => {
      const contract: ContractDefinition = {
        taskQueue: "test-queue",
        workflows: {
          processOrder: {
            input: z.object({ orderId: z.string() }),
            output: z.object({ success: z.boolean() }),
          },
        },
      };

      expect(contract.taskQueue).toBe("test-queue");
      expect(contract.workflows).toBeDefined();
    });

    it("should correctly define a contract with global activities", () => {
      const contract: ContractDefinition = {
        taskQueue: "test-queue",
        workflows: {
          processOrder: {
            input: z.object({ orderId: z.string() }),
            output: z.object({ success: z.boolean() }),
          },
        },
        activities: {
          log: {
            input: z.object({ message: z.string() }),
            output: z.void(),
          },
        },
      };

      expect(contract.activities).toBeDefined();
    });
  });

  describe("Utility Types", () => {
    it("should extract workflow names as union", () => {
      const contract = {
        taskQueue: "test",
        workflows: {
          processOrder: {
            input: z.object({ orderId: z.string() }),
            output: z.object({ success: z.boolean() }),
          },
          sendNotification: {
            input: z.object({ userId: z.string() }),
            output: z.void(),
          },
        },
      } satisfies ContractDefinition;

      type WorkflowNames = InferWorkflowNames<typeof contract>;
      const name1: WorkflowNames = "processOrder";
      const name2: WorkflowNames = "sendNotification";

      expect(name1).toBe("processOrder");
      expect(name2).toBe("sendNotification");
    });

    it("should extract activity names as union", () => {
      const contract = {
        taskQueue: "test",
        workflows: {},
        activities: {
          log: {
            input: z.object({ message: z.string() }),
            output: z.void(),
          },
          sendEmail: {
            input: z.object({ to: z.string() }),
            output: z.object({ messageId: z.string() }),
          },
        },
      } satisfies ContractDefinition;

      type ActivityNames = InferActivityNames<typeof contract>;
      const name1: ActivityNames = "log";
      const name2: ActivityNames = "sendEmail";

      expect(name1).toBe("log");
      expect(name2).toBe("sendEmail");
    });

    it("should extract workflow definitions", () => {
      const contract = {
        taskQueue: "test",
        workflows: {
          processOrder: {
            input: z.object({ orderId: z.string() }),
            output: z.object({ success: z.boolean() }),
          },
        },
      } satisfies ContractDefinition;

      type Workflows = InferContractWorkflows<typeof contract>;
      const workflows: Workflows = contract.workflows;

      expect(workflows.processOrder).toBeDefined();
    });
  });
});
