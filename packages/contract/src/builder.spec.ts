import { describe, expect, it } from "vitest";
import { defineContract } from "./builder.js";
import { z } from "zod";

describe("Contract Builder", () => {
  describe("defineContract", () => {
    it("should create a contract with workflows", () => {
      const contract = defineContract({
        taskQueue: "test-queue",
        workflows: {
          processOrder: {
            input: z.object({ orderId: z.string() }),
            output: z.object({ status: z.string() }),
          },
        },
      });

      expect(contract.taskQueue).toBe("test-queue");
      expect(contract.workflows.processOrder).toBeDefined();
      expect(contract.workflows.processOrder.input).toBeDefined();
      expect(contract.workflows.processOrder.output).toBeDefined();
    });

    it("should create a contract with global activities", () => {
      const contract = defineContract({
        taskQueue: "test-queue",
        workflows: {
          simpleWorkflow: {
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
      });

      expect(contract.activities).toBeDefined();
      expect(contract.activities?.sendEmail).toBeDefined();
    });

    it("should create a contract with workflow-specific activities", () => {
      const contract = defineContract({
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
              processPayment: {
                input: z.object({ amount: z.number() }),
                output: z.object({ transactionId: z.string() }),
              },
            },
          },
        },
      });

      expect(contract.workflows.processOrder.activities).toBeDefined();
      expect(contract.workflows.processOrder.activities?.validateInventory).toBeDefined();
      expect(contract.workflows.processOrder.activities?.processPayment).toBeDefined();
    });

    it("should support signals in workflow definitions", () => {
      const contract = defineContract({
        taskQueue: "test-queue",
        workflows: {
          processOrder: {
            input: z.object({ orderId: z.string() }),
            output: z.object({ status: z.string() }),
            signals: {
              cancel: {
                input: z.object({ reason: z.string() }),
              },
              addItem: {
                input: z.object({ itemId: z.string(), quantity: z.number() }),
              },
            },
          },
        },
      });

      expect(contract.workflows.processOrder.signals).toBeDefined();
      expect(contract.workflows.processOrder.signals?.cancel).toBeDefined();
      expect(contract.workflows.processOrder.signals?.addItem).toBeDefined();
    });

    it("should support queries in workflow definitions", () => {
      const contract = defineContract({
        taskQueue: "test-queue",
        workflows: {
          processOrder: {
            input: z.object({ orderId: z.string() }),
            output: z.object({ status: z.string() }),
            queries: {
              getStatus: {
                input: z.object({}),
                output: z.object({ status: z.string(), progress: z.number() }),
              },
              getTotal: {
                input: z.object({}),
                output: z.object({ amount: z.number() }),
              },
            },
          },
        },
      });

      expect(contract.workflows.processOrder.queries).toBeDefined();
      expect(contract.workflows.processOrder.queries?.getStatus).toBeDefined();
      expect(contract.workflows.processOrder.queries?.getTotal).toBeDefined();
    });

    it("should support updates in workflow definitions", () => {
      const contract = defineContract({
        taskQueue: "test-queue",
        workflows: {
          processOrder: {
            input: z.object({ orderId: z.string() }),
            output: z.object({ status: z.string() }),
            updates: {
              updateDiscount: {
                input: z.object({ percentage: z.number() }),
                output: z.object({ newTotal: z.number() }),
              },
              updateShippingAddress: {
                input: z.object({ address: z.string() }),
                output: z.object({ updated: z.boolean() }),
              },
            },
          },
        },
      });

      expect(contract.workflows.processOrder.updates).toBeDefined();
      expect(contract.workflows.processOrder.updates?.updateDiscount).toBeDefined();
      expect(contract.workflows.processOrder.updates?.updateShippingAddress).toBeDefined();
    });

    it("should support multiple workflows", () => {
      const contract = defineContract({
        taskQueue: "test-queue",
        workflows: {
          processOrder: {
            input: z.object({ orderId: z.string() }),
            output: z.object({ status: z.string() }),
          },
          cancelOrder: {
            input: z.object({ orderId: z.string(), reason: z.string() }),
            output: z.object({ cancelled: z.boolean() }),
          },
          refundOrder: {
            input: z.object({ orderId: z.string(), amount: z.number() }),
            output: z.object({ refunded: z.boolean(), transactionId: z.string() }),
          },
        },
      });

      expect(Object.keys(contract.workflows)).toHaveLength(3);
      expect(contract.workflows.processOrder).toBeDefined();
      expect(contract.workflows.cancelOrder).toBeDefined();
      expect(contract.workflows.refundOrder).toBeDefined();
    });

    it("should validate single parameter pattern", () => {
      const contract = defineContract({
        taskQueue: "test-queue",
        workflows: {
          simpleWorkflow: {
            input: z.string(), // Single primitive
            output: z.object({ result: z.string() }),
          },
          complexWorkflow: {
            input: z.object({
              // Object with multiple properties
              orderId: z.string(),
              customerId: z.string(),
              amount: z.number(),
            }),
            output: z.object({ success: z.boolean() }),
          },
          arrayWorkflow: {
            input: z.array(
              z.object({
                // Array of objects
                id: z.string(),
                value: z.number(),
              }),
            ),
            output: z.object({ processed: z.number() }),
          },
        },
      });

      expect(contract.workflows.simpleWorkflow.input).toBeDefined();
      expect(contract.workflows.complexWorkflow.input).toBeDefined();
      expect(contract.workflows.arrayWorkflow.input).toBeDefined();
    });

    it("should preserve type information", () => {
      const contract = defineContract({
        taskQueue: "my-queue",
        workflows: {
          myWorkflow: {
            input: z.object({ id: z.string() }),
            output: z.object({ success: z.boolean() }),
          },
        },
      });

      // Type assertions to verify inference works
      const taskQueue: string = contract.taskQueue;
      expect(taskQueue).toBe("my-queue");
    });
  });
});
