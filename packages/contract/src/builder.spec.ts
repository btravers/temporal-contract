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

  describe("defineContract validation", () => {
    it("should throw when taskQueue is empty", () => {
      expect(() =>
        defineContract({
          taskQueue: "",
          workflows: {
            test: {
              input: z.object({}),
              output: z.object({}),
            },
          },
        }),
      ).toThrow("taskQueue cannot be empty");
    });

    it("should throw when taskQueue is only whitespace", () => {
      expect(() =>
        defineContract({
          taskQueue: "   ",
          workflows: {
            test: {
              input: z.object({}),
              output: z.object({}),
            },
          },
        }),
      ).toThrow("Contract error");
    });

    it("should throw when no workflows are defined", () => {
      expect(() =>
        defineContract({
          taskQueue: "test",
          workflows: {},
        }),
      ).toThrow("at least one workflow is required");
    });

    it("should throw when workflow name is invalid", () => {
      expect(() =>
        defineContract({
          taskQueue: "test",
          workflows: {
            "invalid-name": {
              input: z.object({}),
              output: z.object({}),
            },
          },
        }),
      ).toThrow("must be a valid JavaScript identifier");
    });

    it("should throw when global activity name is invalid", () => {
      expect(() =>
        defineContract({
          taskQueue: "test",
          workflows: {
            test: {
              input: z.object({}),
              output: z.object({}),
            },
          },
          activities: {
            "send-email": {
              input: z.object({}),
              output: z.object({}),
            },
          },
        }),
      ).toThrow("must be a valid JavaScript identifier");
    });

    it("should throw when workflow activity conflicts with global activity", () => {
      expect(() =>
        defineContract({
          taskQueue: "test",
          workflows: {
            processOrder: {
              input: z.object({}),
              output: z.object({}),
              activities: {
                sendEmail: {
                  input: z.object({}),
                  output: z.object({}),
                },
              },
            },
          },
          activities: {
            sendEmail: {
              input: z.object({}),
              output: z.object({}),
            },
          },
        }),
      ).toThrow(
        'workflow "processOrder" has activity "sendEmail" that conflicts with a global activity. Consider renaming the workflow-specific activity or removing the global activity "sendEmail".',
      );
    });

    it("should throw when signal name is invalid", () => {
      expect(() =>
        defineContract({
          taskQueue: "test",
          workflows: {
            test: {
              input: z.object({}),
              output: z.object({}),
              signals: {
                "cancel-order": {
                  input: z.object({}),
                },
              },
            },
          },
        }),
      ).toThrow("must be a valid JavaScript identifier");
    });

    it("should throw when query name is invalid", () => {
      expect(() =>
        defineContract({
          taskQueue: "test",
          workflows: {
            test: {
              input: z.object({}),
              output: z.object({}),
              queries: {
                "get-status": {
                  input: z.object({}),
                  output: z.object({}),
                },
              },
            },
          },
        }),
      ).toThrow("must be a valid JavaScript identifier");
    });

    it("should throw when update name is invalid", () => {
      expect(() =>
        defineContract({
          taskQueue: "test",
          workflows: {
            test: {
              input: z.object({}),
              output: z.object({}),
              updates: {
                "update-amount": {
                  input: z.object({}),
                  output: z.object({}),
                },
              },
            },
          },
        }),
      ).toThrow("must be a valid JavaScript identifier");
    });

    it("should allow valid camelCase names", () => {
      expect(() =>
        defineContract({
          taskQueue: "test-queue",
          workflows: {
            processOrder: {
              input: z.object({}),
              output: z.object({}),
              activities: {
                sendEmail: {
                  input: z.object({}),
                  output: z.object({}),
                },
              },
              signals: {
                cancelOrder: {
                  input: z.object({}),
                },
              },
              queries: {
                getStatus: {
                  input: z.object({}),
                  output: z.object({}),
                },
              },
              updates: {
                updateAmount: {
                  input: z.object({}),
                  output: z.object({}),
                },
              },
            },
          },
        }),
      ).not.toThrow();
    });

    it("should allow names with underscores and dollar signs", () => {
      expect(() =>
        defineContract({
          taskQueue: "test",
          workflows: {
            process_order: {
              input: z.object({}),
              output: z.object({}),
            },
            $process: {
              input: z.object({}),
              output: z.object({}),
            },
          },
          activities: {
            send_email: {
              input: z.object({}),
              output: z.object({}),
            },
            $send: {
              input: z.object({}),
              output: z.object({}),
            },
          },
        }),
      ).not.toThrow();
    });
  });

  describe("Edge Cases", () => {
    it("should handle empty object schemas", () => {
      const contract = defineContract({
        taskQueue: "test",
        workflows: {
          empty: {
            input: z.object({}),
            output: z.object({}),
          },
        },
      });
      expect(contract).toBeDefined();
      expect(contract.workflows.empty.input).toBeDefined();
    });

    it("should handle void input", () => {
      const contract = defineContract({
        taskQueue: "test",
        workflows: {
          noInput: {
            input: z.void(),
            output: z.object({ result: z.string() }),
          },
        },
      });
      expect(contract).toBeDefined();
    });

    it("should handle workflows without activities, signals, queries, or updates", () => {
      const contract = defineContract({
        taskQueue: "test",
        workflows: {
          simple: {
            input: z.string(),
            output: z.string(),
          },
        },
      });
      const workflow = contract.workflows.simple;
      expect("activities" in workflow).toBe(false);
      expect("signals" in workflow).toBe(false);
      expect("queries" in workflow).toBe(false);
      expect("updates" in workflow).toBe(false);
    });

    it("should handle contract without global activities", () => {
      const contract = defineContract({
        taskQueue: "test",
        workflows: {
          test: {
            input: z.object({}),
            output: z.object({}),
          },
        },
      });
      expect("activities" in contract).toBe(false);
    });

    it("should throw when workflow is missing input", () => {
      expect(() =>
        defineContract({
          taskQueue: "test",
          workflows: {
            // @ts-expect-error - Testing validation with missing input
            test: {
              output: z.object({}),
            },
          },
        }),
      ).toThrow("Contract error");
    });

    it("should throw when workflow is missing output", () => {
      expect(() =>
        defineContract({
          taskQueue: "test",
          workflows: {
            // @ts-expect-error - Testing validation with missing output
            test: {
              input: z.object({}),
            },
          },
        }),
      ).toThrow("Contract error");
    });

    it("should throw when activity is missing input", () => {
      expect(() =>
        defineContract({
          taskQueue: "test",
          workflows: {
            test: {
              input: z.object({}),
              output: z.object({}),
            },
          },
          activities: {
            // @ts-expect-error - Testing validation with missing input
            test: {
              output: z.object({}),
            },
          },
        }),
      ).toThrow("Contract error");
    });

    it("should throw when activity is missing output", () => {
      expect(() =>
        defineContract({
          taskQueue: "test",
          workflows: {
            test: {
              input: z.object({}),
              output: z.object({}),
            },
          },
          activities: {
            // @ts-expect-error - Testing validation with missing output
            test: {
              input: z.object({}),
            },
          },
        }),
      ).toThrow("Contract error");
    });

    it("should throw when workflow activity name is invalid", () => {
      expect(() =>
        defineContract({
          taskQueue: "test",
          workflows: {
            test: {
              input: z.object({}),
              output: z.object({}),
              activities: {
                "invalid-name": {
                  input: z.object({}),
                  output: z.object({}),
                },
              },
            },
          },
        }),
      ).toThrow("must be a valid JavaScript identifier");
    });

    it("should throw when input is not a Zod schema", () => {
      expect(() =>
        defineContract({
          taskQueue: "test",
          workflows: {
            test: {
              // @ts-expect-error - Testing validation with invalid input type
              input: "not a schema",
              output: z.object({}),
            },
          },
        }),
      ).toThrow("Contract error");
    });

    it("should throw when output is not a Zod schema", () => {
      expect(() =>
        defineContract({
          taskQueue: "test",
          workflows: {
            test: {
              input: z.object({}),
              // @ts-expect-error - Testing validation with invalid output type
              output: { invalid: true },
            },
          },
        }),
      ).toThrow("Contract error");
    });
  });

  describe("Standard Schema compatibility", () => {
    it("should work with Valibot schemas", async () => {
      const v = await import("valibot");

      const contract = defineContract({
        taskQueue: "test-queue",
        workflows: {
          processOrder: {
            input: v.object({ orderId: v.string() }),
            output: v.object({ status: v.string() }),
          },
        },
        activities: {
          sendEmail: {
            input: v.object({ to: v.string(), subject: v.string() }),
            output: v.object({ sent: v.boolean() }),
          },
        },
      });

      expect(contract.taskQueue).toBe("test-queue");
      expect(contract.workflows.processOrder).toBeDefined();
      expect(contract.activities?.sendEmail).toBeDefined();

      // Verify Standard Schema properties exist
      expect(contract.workflows.processOrder.input["~standard"]).toBeDefined();
      expect(contract.workflows.processOrder.input["~standard"].version).toBe(1);
      expect(contract.workflows.processOrder.input["~standard"].vendor).toBe("valibot");
    });

    it("should work with ArkType schemas", async () => {
      const { type } = await import("arktype");

      const contract = defineContract({
        taskQueue: "test-queue",
        workflows: {
          processOrder: {
            input: type({ orderId: "string" }),
            output: type({ status: "string" }),
          },
        },
        activities: {
          validatePayment: {
            input: type({ amount: "number" }),
            output: type({ valid: "boolean" }),
          },
        },
      });

      expect(contract.taskQueue).toBe("test-queue");
      expect(contract.workflows.processOrder).toBeDefined();
      expect(contract.activities?.validatePayment).toBeDefined();

      // Verify Standard Schema properties exist
      expect(contract.workflows.processOrder.input["~standard"]).toBeDefined();
      expect(contract.workflows.processOrder.input["~standard"].version).toBe(1);
      expect(contract.workflows.processOrder.input["~standard"].vendor).toBe("arktype");
    });

    it("should work with mixed validation libraries", async () => {
      const v = await import("valibot");
      const { type } = await import("arktype");

      const contract = defineContract({
        taskQueue: "test-queue",
        workflows: {
          processZod: {
            input: z.object({ id: z.string() }),
            output: z.object({ result: z.string() }),
          },
          processValibot: {
            input: v.object({ id: v.string() }),
            output: v.object({ result: v.string() }),
          },
          processArkType: {
            input: type({ id: "string" }),
            output: type({ result: "string" }),
          },
        },
      });

      expect(contract.workflows.processZod).toBeDefined();
      expect(contract.workflows.processValibot).toBeDefined();
      expect(contract.workflows.processArkType).toBeDefined();

      // Verify each has correct vendor
      expect(contract.workflows.processZod.input["~standard"].vendor).toBe("zod");
      expect(contract.workflows.processValibot.input["~standard"].vendor).toBe("valibot");
      expect(contract.workflows.processArkType.input["~standard"].vendor).toBe("arktype");
    });
  });
});
