import { describe, expect, it } from "vitest";
import { Context, Effect, Layer, Schema } from "effect";
import { defineEffectContract } from "@temporal-contract/contract-effect";
import {
  ActivityDefinitionNotFoundError,
  ActivityError,
  ActivityInputValidationError,
  ActivityOutputValidationError,
} from "./errors.js";
import { declareActivitiesHandler, declareActivitiesHandlerWithLayer } from "./activity.js";

describe("declareActivitiesHandler", () => {
  it("should create an activities handler from Effect implementations", () => {
    const contract = defineEffectContract({
      taskQueue: "test-queue",
      workflows: {
        testWorkflow: {
          input: Schema.Struct({ value: Schema.String }),
          output: Schema.Struct({ result: Schema.String }),
        },
      },
      activities: {
        sendEmail: {
          input: Schema.Struct({ to: Schema.String, subject: Schema.String }),
          output: Schema.Struct({ sent: Schema.Boolean }),
        },
      },
    });

    const activities = declareActivitiesHandler({
      contract,
      activities: {
        testWorkflow: {},
        sendEmail: (_args) => Effect.succeed({ sent: true }),
      },
    });

    expect(activities).toEqual(expect.objectContaining({ sendEmail: expect.any(Function) }));
  });

  it("should execute activity successfully and return the value", async () => {
    const contract = defineEffectContract({
      taskQueue: "test-queue",
      workflows: {},
      activities: {
        processPayment: {
          input: Schema.Struct({ amount: Schema.Number, currency: Schema.String }),
          output: Schema.Struct({ transactionId: Schema.String }),
        },
      },
    });

    const activities = declareActivitiesHandler({
      contract,
      activities: {
        processPayment: (args) => Effect.succeed({ transactionId: `tx-${args.amount}` }),
      },
    });

    const result = await activities.processPayment({ amount: 100, currency: "USD" });
    expect(result).toEqual({ transactionId: "tx-100" });
  });

  it("should throw ActivityInputValidationError for invalid input", async () => {
    const contract = defineEffectContract({
      taskQueue: "test-queue",
      workflows: {},
      activities: {
        strictActivity: {
          input: Schema.Struct({ amount: Schema.Number }),
          output: Schema.Struct({ success: Schema.Boolean }),
        },
      },
    });

    const activities = declareActivitiesHandler({
      contract,
      activities: {
        strictActivity: (_args) => Effect.succeed({ success: true }),
      },
    });

    await expect(
      // @ts-expect-error intentionally invalid input
      activities.strictActivity({ amount: "not-a-number" }),
    ).rejects.toBeInstanceOf(ActivityInputValidationError);
  });

  it("should throw ActivityOutputValidationError when output schema fails", async () => {
    const contract = defineEffectContract({
      taskQueue: "test-queue",
      workflows: {},
      activities: {
        fetchData: {
          input: Schema.Struct({ id: Schema.String }),
          output: Schema.Struct({ value: Schema.Number }),
        },
      },
    });

    const activities = declareActivitiesHandler({
      contract,
      activities: {
        // @ts-expect-error intentionally wrong output type
        fetchData: (_args) => Effect.succeed({ value: "not-a-number" }),
      },
    });

    await expect(activities.fetchData({ id: "abc" })).rejects.toBeInstanceOf(
      ActivityOutputValidationError,
    );
  });

  it("should rethrow ActivityError for Temporal retry policies", async () => {
    const contract = defineEffectContract({
      taskQueue: "test-queue",
      workflows: {},
      activities: {
        failingActivity: {
          input: Schema.Struct({ value: Schema.String }),
          output: Schema.Struct({ result: Schema.String }),
        },
      },
    });

    const activities = declareActivitiesHandler({
      contract,
      activities: {
        failingActivity: (_args) =>
          Effect.fail(
            new ActivityError({
              code: "ACTIVITY_FAILED",
              message: "Something went wrong",
              cause: { info: "details" },
            }),
          ),
      },
    });

    await expect(activities.failingActivity({ value: "test" })).rejects.toMatchObject({
      _tag: "ActivityError",
      code: "ACTIVITY_FAILED",
      message: "Something went wrong",
    });
  });

  it("should wrap defects (unexpected errors) in ActivityError", async () => {
    const contract = defineEffectContract({
      taskQueue: "test-queue",
      workflows: {},
      activities: {
        buggingActivity: {
          input: Schema.Struct({ value: Schema.String }),
          output: Schema.Struct({ result: Schema.String }),
        },
      },
    });

    const activities = declareActivitiesHandler({
      contract,
      activities: {
        buggingActivity: (_args) => Effect.die(new Error("Unexpected crash")),
      },
    });

    await expect(activities.buggingActivity({ value: "test" })).rejects.toMatchObject({
      _tag: "ActivityError",
      code: "DEFECT",
    });
  });

  it("should support Effect.gen for activity implementations", async () => {
    const contract = defineEffectContract({
      taskQueue: "test-queue",
      workflows: {},
      activities: {
        compute: {
          input: Schema.Struct({ x: Schema.Number, y: Schema.Number }),
          output: Schema.Struct({ sum: Schema.Number, product: Schema.Number }),
        },
      },
    });

    const activities = declareActivitiesHandler({
      contract,
      activities: {
        compute: (args) =>
          Effect.gen(function* () {
            yield* Effect.sleep("0 millis");
            return { sum: args.x + args.y, product: args.x * args.y };
          }),
      },
    });

    const result = await activities.compute({ x: 3, y: 4 });
    expect(result).toEqual({ sum: 7, product: 12 });
  });

  it("should support workflow-scoped activities (flattened to root level)", async () => {
    const contract = defineEffectContract({
      taskQueue: "test-queue",
      workflows: {
        orderWorkflow: {
          input: Schema.Struct({ orderId: Schema.String }),
          output: Schema.Struct({ status: Schema.String }),
          activities: {
            validateOrder: {
              input: Schema.Struct({ orderId: Schema.String }),
              output: Schema.Struct({ valid: Schema.Boolean }),
            },
          },
        },
      },
    });

    const activities = declareActivitiesHandler({
      contract,
      activities: {
        orderWorkflow: {
          validateOrder: (args) => Effect.succeed({ valid: args.orderId.length > 0 }),
        },
      },
    });

    // validateOrder is available at root level (Temporal flat structure)
    const result = await activities.validateOrder({ orderId: "123" });
    expect(result).toEqual({ valid: true });
  });

  it("should throw ActivityDefinitionNotFoundError for unknown activities", () => {
    const contract = defineEffectContract({
      taskQueue: "test-queue",
      workflows: {},
      activities: {
        validActivity: {
          input: Schema.Struct({ value: Schema.String }),
          output: Schema.Struct({ result: Schema.String }),
        },
      },
    });

    expect(() => {
      declareActivitiesHandler({
        contract,
        activities: {
          validActivity: (_args: unknown) => Effect.succeed({ result: "test" }),
          // @ts-expect-error intentionally unknown activity
          unknownActivity: (_args: unknown) => Effect.succeed({ result: "test" }),
        },
      });
    }).toThrow(ActivityDefinitionNotFoundError);
  });

  it("ActivityError._tag is 'ActivityError' for catchTag usage", async () => {
    const contract = defineEffectContract({
      taskQueue: "test-queue",
      workflows: {},
      activities: {
        myActivity: {
          input: Schema.Struct({ value: Schema.String }),
          output: Schema.Struct({ result: Schema.String }),
        },
      },
    });

    const activities = declareActivitiesHandler({
      contract,
      activities: {
        myActivity: (_args) => Effect.fail(new ActivityError({ code: "ERR", message: "fail" })),
      },
    });

    const err = await activities.myActivity({ value: "x" }).catch((e) => e);
    expect(err._tag).toBe("ActivityError");
    expect(err instanceof Error).toBe(true);
  });
});

describe("declareActivitiesHandlerWithLayer", () => {
  it("should inject Effect services into activity implementations", async () => {
    const contract = defineEffectContract({
      taskQueue: "test-queue",
      workflows: {},
      activities: {
        greet: {
          input: Schema.Struct({ name: Schema.String }),
          output: Schema.Struct({ greeting: Schema.String }),
        },
      },
    });

    class Greeter extends Context.Tag("Greeter")<Greeter, { greet: (name: string) => string }>() {}

    const GreeterLive = Layer.succeed(Greeter, {
      greet: (name) => `Hello, ${name}!`,
    });

    const activities = await declareActivitiesHandlerWithLayer({
      contract,
      layer: GreeterLive,
      activities: {
        greet: (args) =>
          Effect.gen(function* () {
            const greeter = yield* Greeter;
            return { greeting: greeter.greet(args.name) };
          }),
      },
    });

    const result = await activities.greet({ name: "World" });
    expect(result).toEqual({ greeting: "Hello, World!" });
  });

  it("should rethrow ActivityError from Layer-based activities", async () => {
    const contract = defineEffectContract({
      taskQueue: "test-queue",
      workflows: {},
      activities: {
        fetch: {
          input: Schema.Struct({ id: Schema.String }),
          output: Schema.Struct({ data: Schema.String }),
        },
      },
    });

    class Fetcher extends Context.Tag("Fetcher")<
      Fetcher,
      { fetch: (id: string) => Effect.Effect<string, ActivityError> }
    >() {}

    const FetcherLive = Layer.succeed(Fetcher, {
      fetch: (_id) =>
        Effect.fail(new ActivityError({ code: "FETCH_FAILED", message: "Not found" })),
    });

    const activities = await declareActivitiesHandlerWithLayer({
      contract,
      layer: FetcherLive,
      activities: {
        fetch: (args) =>
          Effect.gen(function* () {
            const fetcher = yield* Fetcher;
            const data = yield* fetcher.fetch(args.id);
            return { data };
          }),
      },
    });

    await expect(activities.fetch({ id: "missing" })).rejects.toMatchObject({
      _tag: "ActivityError",
      code: "FETCH_FAILED",
    });
  });
});
