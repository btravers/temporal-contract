import { describe, expect, it } from "vitest";
import { Future, Result } from "@swan-io/boxed";
import { z } from "zod";
import { declareActivitiesHandler, ActivityError } from "./handler.js";
import { ActivityDefinitionNotFoundError } from "./errors.js";
import type { ContractDefinition } from "@temporal-contract/contract";

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
      expect((result as { transactionId: string }).transactionId).toBe("tx-100");

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
          fetchData: (args) => {
            return Future.value(Result.Ok({ data: `data-${args.id}`, timestamp: 123 }));
          },
        },
      });

      const result = await handler.activities["fetchData"]!({ id: "abc" });
      expect((result as { data: string; timestamp: number }).data).toBe("data-abc");
      expect((result as { data: string; timestamp: number }).timestamp).toBe(123);

      // Invalid output should throw
      const badHandler = declareActivitiesHandler({
        contract,
        activities: {
          fetchData: (
            _args,
          ): Future<Result<{ data: string; timestamp: number }, ActivityError>> => {
            return Future.value(
              Result.Ok({ data: "test" } as unknown as { data: string; timestamp: number }),
            ); // Missing timestamp
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
      expect((result as { result: string }).result).toBe("success-test");
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
              Result.Error(
                new ActivityError("ACTIVITY_FAILED", "Something went wrong", {
                  info: "additional details",
                }),
              ),
            );
          },
        },
      });

      await expect(handler.activities["failingActivity"]!({ value: "test" })).rejects.toMatchObject(
        {
          name: "ActivityError",
          message: "Something went wrong",
          code: "ACTIVITY_FAILED",
          cause: { info: "additional details" },
        },
      );
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
            return Future.make<Result<{ completed: boolean }, ActivityError>>((resolve) => {
              setTimeout(() => {
                resolve(Result.Ok({ completed: true }));
              }, args.delay);
            });
          },
        },
      });

      const result = await handler.activities["asyncActivity"]!({ delay: 10 });
      expect((result as { completed: boolean }).completed).toBe(true);
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

      const result = await handler.activities["validateOrder"]!({ orderId: "123", amount: 100 });
      expect((result as { valid: boolean }).valid).toBe(true);
    });

    it("should throw if activity definition is not found", () => {
      const contract = {
        taskQueue: "test-queue",
        workflows: {},
        activities: {
          validActivity: {
            input: z.object({ value: z.string() }),
            output: z.object({ result: z.string() }),
          },
        },
      } satisfies ContractDefinition;

      const testActivities = {
        validActivity: (_args: unknown) => Future.value(Result.Ok({ result: "test" })),
        unknownActivity: (_args: unknown) => Future.value(Result.Ok({ result: "test" })),
      };

      expect(() => {
        declareActivitiesHandler({
          contract,
          activities: testActivities,
        });
      }).toThrowError(new ActivityDefinitionNotFoundError("unknownActivity", ["validActivity"]));
    });
  });

  describe("Error Handling", () => {
    it("should throw ActivityInputValidationError for invalid input", async () => {
      const contract = {
        taskQueue: "test-queue",
        workflows: {},
        activities: {
          strictActivity: {
            input: z.object({ amount: z.number().positive(), email: z.string().email() }),
            output: z.object({ success: z.boolean() }),
          },
        },
      } satisfies ContractDefinition;

      const handler = declareActivitiesHandler({
        contract,
        activities: {
          strictActivity: (_args) => {
            return Future.value(Result.Ok({ success: true }));
          },
        },
      });

      await expect(
        handler.activities["strictActivity"]!({ amount: -10, email: "invalid" }),
      ).rejects.toMatchObject({
        name: "ActivityInputValidationError",
        activityName: "strictActivity",
        message: expect.stringContaining("strictActivity"),
      });
    });

    it("should throw ActivityOutputValidationError for invalid output", async () => {
      const contract = {
        taskQueue: "test-queue",
        workflows: {},
        activities: {
          strictOutputActivity: {
            input: z.object({ id: z.string() }),
            output: z.object({ value: z.number(), status: z.enum(["active", "inactive"]) }),
          },
        },
      } satisfies ContractDefinition;

      const handler = declareActivitiesHandler({
        contract,
        activities: {
          strictOutputActivity: (_args) => {
            return Future.value(
              Result.Ok({ value: "not-a-number", status: "active" }) as unknown as Result<
                { value: number; status: "active" | "inactive" },
                ActivityError
              >,
            );
          },
        },
      });

      await expect(
        handler.activities["strictOutputActivity"]!({ id: "123" }),
      ).rejects.toMatchObject({
        name: "ActivityOutputValidationError",
        activityName: "strictOutputActivity",
        message: expect.stringContaining("strictOutputActivity"),
      });
    });
  });
});
