import { describe, expect, it } from "vitest";
import { Schema } from "effect";
import { defineEffectContract } from "./contract.js";
import type {
  EffectClientInferInput,
  EffectClientInferOutput,
  EffectWorkerInferInput,
  EffectWorkerInferOutput,
} from "./types.js";

describe("defineEffectContract", () => {
  it("should return the contract unchanged (identity function)", () => {
    const contract = defineEffectContract({
      taskQueue: "test-queue",
      workflows: {
        testWorkflow: {
          input: Schema.Struct({ name: Schema.String }),
          output: Schema.Struct({ result: Schema.String }),
        },
      },
    });

    expect(contract.taskQueue).toBe("test-queue");
    expect(contract.workflows["testWorkflow"]).toBeDefined();
  });

  it("should preserve task queue", () => {
    const contract = defineEffectContract({
      taskQueue: "my-special-queue",
      workflows: {},
    });

    expect(contract.taskQueue).toBe("my-special-queue");
  });

  it("should support workflow with activities", () => {
    const contract = defineEffectContract({
      taskQueue: "order-queue",
      workflows: {
        processOrder: {
          input: Schema.Struct({ orderId: Schema.String }),
          output: Schema.Struct({ status: Schema.String }),
          activities: {
            chargePayment: {
              input: Schema.Struct({ amount: Schema.Number }),
              output: Schema.Struct({ transactionId: Schema.String }),
            },
          },
        },
      },
    });

    expect(contract.workflows["processOrder"]?.activities?.["chargePayment"]).toBeDefined();
  });

  it("should support workflow with signals, queries, and updates", () => {
    const contract = defineEffectContract({
      taskQueue: "signal-queue",
      workflows: {
        longRunning: {
          input: Schema.Struct({ id: Schema.String }),
          output: Schema.Struct({ completed: Schema.Boolean }),
          signals: {
            cancel: {
              input: Schema.Struct({ reason: Schema.String }),
            },
          },
          queries: {
            getStatus: {
              input: Schema.Tuple(),
              output: Schema.String,
            },
          },
          updates: {
            pause: {
              input: Schema.Struct({ durationMs: Schema.Number }),
              output: Schema.Boolean,
            },
          },
        },
      },
    });

    const wf = contract.workflows["longRunning"];
    expect(wf?.signals?.["cancel"]).toBeDefined();
    expect(wf?.queries?.["getStatus"]).toBeDefined();
    expect(wf?.updates?.["pause"]).toBeDefined();
  });

  it("should support global activities at contract level", () => {
    const contract = defineEffectContract({
      taskQueue: "global-queue",
      workflows: {
        myWorkflow: {
          input: Schema.Struct({ value: Schema.String }),
          output: Schema.Struct({ result: Schema.String }),
        },
      },
      activities: {
        log: {
          input: Schema.Struct({ message: Schema.String }),
          output: Schema.Void,
        },
      },
    });

    expect(contract.activities?.["log"]).toBeDefined();
  });
});

describe("Effect Schema type inference", () => {
  it("should infer correct client input type (encoded)", () => {
    const orderSchema = Schema.Struct({
      orderId: Schema.String,
      amount: Schema.Number,
    });

    const def = {
      input: orderSchema,
      output: Schema.Struct({ status: Schema.String }),
    };

    type Input = EffectClientInferInput<typeof def>;
    type _Check = Input extends { orderId: string; amount: number } ? true : false;
    const _typeCheck: _Check = true;
    expect(_typeCheck).toBe(true);
  });

  it("should infer correct client output type (decoded)", () => {
    const def = {
      input: Schema.Struct({ id: Schema.String }),
      output: Schema.Struct({ status: Schema.String }),
    };

    type Output = EffectClientInferOutput<typeof def>;
    type _Check = Output extends { status: string } ? true : false;
    const _typeCheck: _Check = true;
    expect(_typeCheck).toBe(true);
  });

  it("should infer correct worker input type (decoded)", () => {
    const def = {
      input: Schema.Struct({ name: Schema.String }),
      output: Schema.Struct({ result: Schema.String }),
    };

    type Input = EffectWorkerInferInput<typeof def>;
    type _Check = Input extends { name: string } ? true : false;
    const _typeCheck: _Check = true;
    expect(_typeCheck).toBe(true);
  });

  it("should infer correct worker output type (encoded)", () => {
    const def = {
      input: Schema.Struct({ id: Schema.String }),
      output: Schema.Struct({ count: Schema.Number }),
    };

    type Output = EffectWorkerInferOutput<typeof def>;
    type _Check = Output extends { count: number } ? true : false;
    const _typeCheck: _Check = true;
    expect(_typeCheck).toBe(true);
  });

  it("should support transforming schemas with different input/output types", () => {
    // Schema that transforms: encoded = string, decoded = Date
    const DateFromString = Schema.transform(Schema.String, Schema.DateFromSelf, {
      strict: true,
      decode: (s) => new Date(s),
      encode: (d) => d.toISOString(),
    });

    const def = {
      input: Schema.Struct({ createdAt: DateFromString }),
      output: Schema.Struct({ id: Schema.String }),
    };

    // Client sends the encoded form (string)
    type ClientInput = EffectClientInferInput<typeof def>;
    type _ClientInputCheck = ClientInput extends { createdAt: string } ? true : false;
    const _clientInputCheck: _ClientInputCheck = true;
    expect(_clientInputCheck).toBe(true);

    // Worker receives the decoded form (Date)
    type WorkerInput = EffectWorkerInferInput<typeof def>;
    type _WorkerInputCheck = WorkerInput extends { createdAt: Date } ? true : false;
    const _workerInputCheck: _WorkerInputCheck = true;
    expect(_workerInputCheck).toBe(true);
  });
});
