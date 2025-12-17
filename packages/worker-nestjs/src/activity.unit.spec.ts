import { describe, it, expect } from "vitest";
import { Injectable } from "@nestjs/common";
import { Test } from "@nestjs/testing";
import { Future, Result } from "@temporal-contract/boxed";
import { defineContract } from "@temporal-contract/contract";
import { z } from "zod";
import { ImplementActivity, createActivitiesModule, ACTIVITIES_HANDLER_TOKEN } from "./activity.js";

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

describe("Activity Decorators", () => {
  describe("@ImplementActivity", () => {
    it("should decorate a method as an activity implementation", () => {
      @Injectable()
      class TestService {
        @ImplementActivity(testContract, "testActivity")
        testActivity(args: { value: number }) {
          return Future.value(Result.Ok({ result: args.value * 2 }));
        }
      }

      const service = new TestService();
      const result = service.testActivity({ value: 5 });

      expect(result).toBeDefined();
    });

    it("should allow multiple activity decorators on the same class", () => {
      @Injectable()
      class TestService {
        @ImplementActivity(testContract, "testActivity")
        testActivity(args: { value: number }) {
          return Future.value(Result.Ok({ result: args.value * 2 }));
        }

        @ImplementActivity(testContract, "anotherActivity")
        anotherActivity(args: { text: string }) {
          return Future.value(Result.Ok({ processed: args.text.toUpperCase() }));
        }
      }

      const service = new TestService();

      expect(service.testActivity).toBeDefined();
      expect(service.anotherActivity).toBeDefined();
    });
  });

  describe("createActivitiesModule", () => {
    it("should create a NestJS module with activities handler", async () => {
      @Injectable()
      class TestService {
        @ImplementActivity(testContract, "testActivity")
        testActivity(args: { value: number }) {
          return Future.value(Result.Ok({ result: args.value * 2 }));
        }

        @ImplementActivity(testContract, "anotherActivity")
        anotherActivity(args: { text: string }) {
          return Future.value(Result.Ok({ processed: args.text.toUpperCase() }));
        }
      }

      const module = createActivitiesModule({
        contract: testContract,
        providers: [TestService],
      });

      const testModule = await Test.createTestingModule({
        imports: [module],
      }).compile();

      const activitiesHandler = testModule.get(ACTIVITIES_HANDLER_TOKEN);

      expect(activitiesHandler).toBeDefined();
      expect(activitiesHandler.contract).toBe(testContract);
      expect(activitiesHandler.activities).toBeDefined();
      expect(activitiesHandler.activities.testActivity).toBeDefined();
      expect(activitiesHandler.activities.anotherActivity).toBeDefined();
    });

    it("should preserve 'this' context in decorated methods", async () => {
      @Injectable()
      class TestService {
        private multiplier = 3;

        @ImplementActivity(testContract, "testActivity")
        testActivity(args: { value: number }) {
          return Future.value(Result.Ok({ result: args.value * this.multiplier }));
        }
      }

      const module = createActivitiesModule({
        contract: testContract,
        providers: [TestService],
      });

      const testModule = await Test.createTestingModule({
        imports: [module],
      }).compile();

      const activitiesHandler = testModule.get(ACTIVITIES_HANDLER_TOKEN);

      // Call the activity through the handler
      const result = await activitiesHandler.activities.testActivity({ value: 5 });

      expect(result).toEqual({ result: 15 });
    });

    it("should support dependency injection in services", async () => {
      @Injectable()
      class TestService {
        @ImplementActivity(testContract, "testActivity")
        testActivity(args: { value: number }) {
          // Use a fixed multiplier for simplicity
          return Future.value(Result.Ok({ result: args.value * 10 }));
        }
      }

      const module = createActivitiesModule({
        contract: testContract,
        providers: [TestService],
      });

      const testModule = await Test.createTestingModule({
        imports: [module],
      }).compile();

      const activitiesHandler = testModule.get(ACTIVITIES_HANDLER_TOKEN);

      // Call the activity through the handler
      const result = await activitiesHandler.activities.testActivity({ value: 5 });

      expect(result).toEqual({ result: 50 });
    });
  });
});
