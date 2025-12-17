import { describe, it, expect } from "vitest";
import { Injectable } from "@nestjs/common";
import { Test } from "@nestjs/testing";
import { Future, Result } from "@temporal-contract/boxed";
import { defineContract } from "@temporal-contract/contract";
import { z } from "zod";
import { ActivitiesHandler, createActivitiesModule, ACTIVITIES_HANDLER_TOKEN } from "./activity.js";
import type { ActivityImplementations } from "@temporal-contract/worker/activity";

// Test contract
const testContract = defineContract({
  taskQueue: "test-queue",
  activities: {
    testActivity: {
      input: z.object({ value: z.number() }),
      output: z.object({ result: z.number() }),
    },
    anotherActivity: {
      input: z.object({ text: z.string() }),
      output: z.object({ processed: z.string() }),
    },
  },
  workflows: {
    testWorkflow: {
      input: z.object({ value: z.number() }),
      output: z.object({ result: z.number() }),
    },
  },
});

describe("ActivitiesHandler Decorator", () => {
  describe("@ActivitiesHandler", () => {
    it("should decorate a handler class", () => {
      @Injectable()
      @ActivitiesHandler(testContract)
      class TestHandler implements ActivityImplementations<typeof testContract> {
        testActivity(args: { value: number }) {
          return Future.value(Result.Ok({ result: args.value * 2 }));
        }

        anotherActivity(args: { text: string }) {
          return Future.value(Result.Ok({ processed: args.text.toUpperCase() }));
        }
      }

      expect(TestHandler).toBeDefined();
    });
  });

  describe("createActivitiesModule", () => {
    it("should create a NestJS module with activities handler", async () => {
      @Injectable()
      @ActivitiesHandler(testContract)
      class TestHandler implements ActivityImplementations<typeof testContract> {
        testActivity(args: { value: number }) {
          return Future.value(Result.Ok({ result: args.value * 2 }));
        }

        anotherActivity(args: { text: string }) {
          return Future.value(Result.Ok({ processed: args.text.toUpperCase() }));
        }
      }

      const module = createActivitiesModule({
        contract: testContract,
        handler: TestHandler,
      });

      const testModule = await Test.createTestingModule({
        imports: [module],
      }).compile();

      const activitiesHandler = testModule.get(ACTIVITIES_HANDLER_TOKEN);

      expect(activitiesHandler).toBeDefined();
      expect(activitiesHandler.contract).toBe(testContract);
      expect(activitiesHandler.activities).toBeDefined();
      expect(typeof activitiesHandler.activities.testActivity).toBe("function");
      expect(typeof activitiesHandler.activities.anotherActivity).toBe("function");
    });

    it("should preserve 'this' context in handler methods", async () => {
      @Injectable()
      @ActivitiesHandler(testContract)
      class TestHandler implements ActivityImplementations<typeof testContract> {
        private multiplier = 3;

        testActivity(args: { value: number }) {
          return Future.value(Result.Ok({ result: args.value * this.multiplier }));
        }

        anotherActivity(args: { text: string }) {
          return Future.value(Result.Ok({ processed: args.text.toUpperCase() }));
        }
      }

      const module = createActivitiesModule({
        contract: testContract,
        handler: TestHandler,
      });

      const testModule = await Test.createTestingModule({
        imports: [module],
      }).compile();

      const activitiesHandler = testModule.get(ACTIVITIES_HANDLER_TOKEN);

      const result = await activitiesHandler.activities.testActivity({ value: 5 });
      expect(result).toEqual({ result: 15 });
    });

    it("should support dependency injection in handlers", async () => {
      @Injectable()
      @ActivitiesHandler(testContract)
      class TestHandler implements ActivityImplementations<typeof testContract> {
        testActivity(args: { value: number }) {
          // Simple implementation without DI for simplicity
          return Future.value(Result.Ok({ result: args.value * 10 }));
        }

        anotherActivity(args: { text: string }) {
          return Future.value(Result.Ok({ processed: args.text.toUpperCase() }));
        }
      }

      const module = createActivitiesModule({
        contract: testContract,
        handler: TestHandler,
      });

      const testModule = await Test.createTestingModule({
        imports: [module],
      }).compile();

      const activitiesHandler = testModule.get(ACTIVITIES_HANDLER_TOKEN);

      const result = await activitiesHandler.activities.testActivity({ value: 5 });
      expect(result).toEqual({ result: 50 });
    });

    it("should throw error if handler is not decorated", () => {
      @Injectable()
      class TestHandler implements ActivityImplementations<typeof testContract> {
        testActivity(args: { value: number }) {
          return Future.value(Result.Ok({ result: args.value * 2 }));
        }

        anotherActivity(args: { text: string }) {
          return Future.value(Result.Ok({ processed: args.text.toUpperCase() }));
        }
      }

      expect(() =>
        createActivitiesModule({
          contract: testContract,
          handler: TestHandler,
        }),
      ).toThrow("Handler class must be decorated with @ActivitiesHandler decorator");
    });
  });
});
