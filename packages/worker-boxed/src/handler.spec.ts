import { describe, expect, it } from "vitest";
import { Future, Result } from "@swan-io/boxed";
import { z } from "zod";
import { declareActivitiesHandler } from "./handler.js";
import type { ContractDefinition } from "@temporal-contract/core";

describe("Worker-Boxed Package", () => {
  describe("declareActivitiesHandler", () => {
    it("should create an activities handler with Result pattern", () => {
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
          sendEmail: (args) => {
            expect(args.to).toBeDefined();
            return Future.value(Result.Ok({ sent: true }));
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
          processPayment: (args) => {
            return Future.value(Result.Ok({ transactionId: `tx-${args.amount}` }));
          },
        },
      });

      // Valid input should work
      const result = await handler.activities["processPayment"]!({ amount: 100, currency: "USD" });
      expect(result.transactionId).toBe("tx-100");

      // Invalid input should throw
      await expect(
        handler.activities["processPayment"]!({ amount: "invalid" as any, currency: "USD" }),
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
          fetchData: (args) => {
            return Future.value(Result.Ok({ data: `data-${args.id}`, timestamp: 123 }));
          },
        },
      });

      const result = await handler.activities["fetchData"]!({ id: "abc" });
      expect(result.data).toBe("data-abc");
      expect(result.timestamp).toBe(123);

      // Invalid output should throw
      const badHandler = declareActivitiesHandler({
        contract,
        activities: {
          fetchData: (_args) => {
            return Future.value(Result.Ok({ data: "test" } as any)); // Missing timestamp
          },
        },
      });

      await expect(badHandler.activities["fetchData"]!({ id: "abc" })).rejects.toThrow();
    });

    it("should handle Result.Ok by returning value", async () => {
      const contract = {
        taskQueue: "test-queue",
        workflows: {},
        activities: {
          successActivity: {
            input: z.object({ value: z.string() }),
            output: z.object({ result: z.string() }),
          },
        },
      } satisfies ContractDefinition;

      const handler = declareActivitiesHandler({
        contract,
        activities: {
          successActivity: (args) => {
            return Future.value(Result.Ok({ result: `success-${args.value}` }));
          },
        },
      });

      const result = await handler.activities["successActivity"]!({ value: "test" });
      expect(result.result).toBe("success-test");
    });

    it("should handle Result.Error by throwing exception", async () => {
      const contract = {
        taskQueue: "test-queue",
        workflows: {},
        activities: {
          failingActivity: {
            input: z.object({ value: z.string() }),
            output: z.object({ result: z.string() }),
          },
        },
      } satisfies ContractDefinition;

      const handler = declareActivitiesHandler({
        contract,
        activities: {
          failingActivity: (_args) => {
            return Future.value(
              Result.Error({
                code: "ACTIVITY_FAILED",
                message: "Something went wrong",
                details: { info: "additional details" },
              }),
            );
          },
        },
      });

      try {
        await handler.activities["failingActivity"]!({ value: "test" });
        expect.fail("Should have thrown an error");
      } catch (error: any) {
        expect(error.message).toBe("Something went wrong");
        expect(error.code).toBe("ACTIVITY_FAILED");
        expect(error.details).toEqual({ info: "additional details" });
      }
    });

    it("should handle Future properly", async () => {
      const contract = {
        taskQueue: "test-queue",
        workflows: {},
        activities: {
          asyncActivity: {
            input: z.object({ delay: z.number() }),
            output: z.object({ completed: z.boolean() }),
          },
        },
      } satisfies ContractDefinition;

      const handler = declareActivitiesHandler({
        contract,
        activities: {
          asyncActivity: (args) => {
            return Future.make<Result<{ completed: boolean }, any>>((resolve) => {
              setTimeout(() => {
                resolve(Result.Ok({ completed: true }));
              }, args.delay);
            });
          },
        },
      });

      const result = await handler.activities["asyncActivity"]!({ delay: 10 });
      expect(result.completed).toBe(true);
    });

    it("should support workflow-specific activities", async () => {
      const contract = {
        taskQueue: "test-queue",
        workflows: {
          orderWorkflow: {
            input: z.object({ orderId: z.string() }),
            output: z.object({ status: z.string() }),
            activities: {
              validateOrder: {
                input: z.object({ orderId: z.string() }),
                output: z.object({ valid: z.boolean() }),
              },
            },
          },
        },
      } satisfies ContractDefinition;

      const handler = declareActivitiesHandler({
        contract,
        activities: {
          validateOrder: (args) => {
            return Future.value(Result.Ok({ valid: args.orderId.length > 0 }));
          },
        },
      });

      const result = await handler.activities["validateOrder"]!({ orderId: "ORDER-123" });
      expect(result.valid).toBe(true);
    });

    it("should throw if activity definition is not found", () => {
      const contract = {
        taskQueue: "test-queue",
        workflows: {},
        activities: {},
      } satisfies ContractDefinition;

      expect(() => {
        declareActivitiesHandler({
          contract,
          activities: {
            unknownActivity: (_args: any) => Future.value(Result.Ok({ result: "test" })),
          } as any,
        });
      }).toThrow("Activity definition not found");
    });
  });
});
