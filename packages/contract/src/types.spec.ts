import { describe, expect, it } from "vitest";
import { z } from "zod";
import { Future, Result } from "@swan-io/boxed";
import type {
  ActivityDefinition,
  ActivityHandler,
  ContractDefinition,
  WorkerInferActivity,
  WorkerInferInput,
  WorkerInferOutput,
  WorkerInferQuery,
  WorkerInferSignal,
  WorkerInferUpdate,
  WorkerInferWorkflow,
  WorkflowActivityHandler,
  ClientInferActivity,
  ClientInferInput,
  ClientInferOutput,
  ClientInferQuery,
  ClientInferSignal,
  ClientInferUpdate,
  ClientInferWorkflow,
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

      type Input = WorkerInferInput<typeof activityDef>;
      const input: Input = { orderId: "123", amount: 100 };

      expect(input.orderId).toBe("123");
      expect(input.amount).toBe(100);
    });

    it("should infer correct output type", () => {
      const activityDef = {
        input: z.object({ orderId: z.string() }),
        output: z.object({ success: z.boolean(), transactionId: z.string() }),
      } satisfies ActivityDefinition;

      type Output = WorkerInferOutput<typeof activityDef>;
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

    it("should infer correct signal handler type", async () => {
      const signalDef = {
        input: z.object({ itemId: z.string(), quantity: z.number() }),
      } satisfies SignalDefinition;

      type Handler = WorkerInferSignal<typeof signalDef>;
      const handler: Handler = async (args: WorkerInferInput<typeof signalDef>) => {
        expect(args.itemId).toBeDefined();
        expect(args.quantity).toBeDefined();
      };

      await handler({ itemId: "item-1", quantity: 5 });
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

    it("should infer correct query handler type", async () => {
      const queryDef = {
        input: z.object({}),
        output: z.object({ status: z.string(), progress: z.number() }),
      } satisfies QueryDefinition;

      type Handler = WorkerInferQuery<typeof queryDef>;
      const handler: Handler = async (_args: WorkerInferInput<typeof queryDef>) => {
        return { status: "running", progress: 50 };
      };

      await expect(handler({})).resolves.toEqual({ status: "running", progress: 50 });
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

    it("should infer correct update handler type", async () => {
      const updateDef = {
        input: z.object({ percentage: z.number() }),
        output: z.object({ applied: z.boolean(), newAmount: z.number() }),
      } satisfies UpdateDefinition;

      type Handler = WorkerInferUpdate<typeof updateDef>;
      const handler: Handler = async (args: WorkerInferInput<typeof updateDef>) => {
        return { applied: true, newAmount: 100 * (1 - args.percentage / 100) };
      };

      await expect(handler({ percentage: 10 })).resolves.toEqual({
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

    it("should infer correct workflow function type", async () => {
      const workflowDef = {
        input: z.object({ orderId: z.string(), customerId: z.string() }),
        output: z.object({ status: z.string(), total: z.number() }),
      } satisfies WorkflowDefinition;

      type WorkflowFn = WorkerInferWorkflow<typeof workflowDef>;
      const workflow: WorkflowFn = async (args: WorkerInferInput<typeof workflowDef>) => {
        expect(args.orderId).toBeDefined();
        expect(args.customerId).toBeDefined();
        return { status: "completed", total: 100 };
      };

      await expect(workflow({ orderId: "123", customerId: "456" })).resolves.toEqual({
        status: "completed",
        total: 100,
      });
    });
  });

  describe("ContractDefinition", () => {
    it("should correctly define a contract", () => {
      const contractDef = {
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
      } satisfies ContractDefinition;

      expect(contractDef.taskQueue).toBe("test-queue");
      expect(contractDef.workflows).toBeDefined();
      expect(contractDef.activities).toBeDefined();
    });

    it("should support optional activities", () => {
      const contractDef = {
        taskQueue: "test-queue",
        workflows: {
          simpleWorkflow: {
            input: z.object({ value: z.string() }),
            output: z.object({ result: z.string() }),
          },
        },
      } satisfies ContractDefinition;

      expect(contractDef.taskQueue).toBe("test-queue");
      expect(contractDef.workflows).toBeDefined();
      expect((contractDef as { activities?: unknown }).activities).toBeUndefined();
    });
  });

  describe("WorkerInferActivity", () => {
    it("should correctly infer activity function signature", async () => {
      const activityDef = {
        input: z.object({ orderId: z.string(), amount: z.number() }),
        output: z.object({ transactionId: z.string(), success: z.boolean() }),
      } satisfies ActivityDefinition;

      type ActivityFn = WorkerInferActivity<typeof activityDef>;
      const activity: ActivityFn = async (args: WorkerInferInput<typeof activityDef>) => {
        expect(args.orderId).toBeDefined();
        expect(args.amount).toBeDefined();
        return { transactionId: "tx-123", success: true };
      };

      await expect(activity({ orderId: "123", amount: 100 })).resolves.toEqual({
        transactionId: "tx-123",
        success: true,
      });
    });
  });

  describe("Worker vs Client Perspective", () => {
    describe("with z.transform", () => {
      it("should correctly infer worker and client types for activities with transformations", async () => {
        const activityDef = {
          input: z.string().transform(Number),
          output: z.number().transform(String),
        } satisfies ActivityDefinition;

        // Worker receives number (z.output of input, after parsing) and returns number (z.input of output, before serialization)
        type WorkerInput = WorkerInferInput<typeof activityDef>;
        type WorkerOutput = WorkerInferOutput<typeof activityDef>;

        const workerInput: WorkerInput = 123;
        const workerOutput: WorkerOutput = 456;

        expect(workerInput).toBe(123);
        expect(workerOutput).toBe(456);

        // Client sends string (z.input of input, before parsing) and receives string (z.output of output, after serialization)
        type ClientInput = ClientInferInput<typeof activityDef>;
        type ClientOutput = ClientInferOutput<typeof activityDef>;

        const clientInput: ClientInput = "123";
        const clientOutput: ClientOutput = "456";

        expect(clientInput).toBe("123");
        expect(clientOutput).toBe("456");
      });

      it("should correctly infer worker workflow signature", async () => {
        const workflowDef = {
          input: z.object({ amount: z.string().transform(Number) }),
          output: z.object({ result: z.number().transform(String) }),
        } satisfies WorkflowDefinition;

        type WorkerFn = WorkerInferWorkflow<typeof workflowDef>;
        const workerWorkflow: WorkerFn = async (args: WorkerInferInput<typeof workflowDef>) => {
          expect(args.amount).toBe(100);
          return { result: 200 };
        };

        await expect(workerWorkflow({ amount: 100 })).resolves.toEqual({ result: 200 });
      });

      it("should correctly infer client workflow signature", async () => {
        const workflowDef = {
          input: z.object({ amount: z.string().transform(Number) }),
          output: z.object({ result: z.number().transform(String) }),
        } satisfies WorkflowDefinition;

        type ClientFn = ClientInferWorkflow<typeof workflowDef>;
        const clientWorkflow: ClientFn = async (args: ClientInferInput<typeof workflowDef>) => {
          expect(args.amount).toBe("100");
          return { result: "200" };
        };

        await expect(clientWorkflow({ amount: "100" })).resolves.toEqual({ result: "200" });
      });

      it("should correctly infer worker signal signature", async () => {
        const signalDef = {
          input: z.object({ value: z.string().transform(Number) }),
        } satisfies SignalDefinition;

        type WorkerHandler = WorkerInferSignal<typeof signalDef>;
        const workerSignal: WorkerHandler = async (args: WorkerInferInput<typeof signalDef>) => {
          expect(args.value).toBe(42);
        };

        await workerSignal({ value: 42 });
      });

      it("should correctly infer client signal signature", async () => {
        const signalDef = {
          input: z.object({ value: z.string().transform(Number) }),
        } satisfies SignalDefinition;

        type ClientHandler = ClientInferSignal<typeof signalDef>;
        const clientSignal: ClientHandler = (args: ClientInferInput<typeof signalDef>) => {
          expect(args.value).toBe("42");
          return Future.value(Result.Ok(undefined));
        };

        const result = await clientSignal({ value: "42" }).toPromise();
        expect(result.isOk()).toBe(true);
      });

      it("should correctly infer worker query signature", async () => {
        const queryDef = {
          input: z.object({ id: z.string().transform(Number) }),
          output: z.object({ value: z.number().transform(String) }),
        } satisfies QueryDefinition;

        type WorkerHandler = WorkerInferQuery<typeof queryDef>;
        const workerQuery: WorkerHandler = async (args: WorkerInferInput<typeof queryDef>) => {
          expect(args.id).toBe(123);
          return { value: 456 };
        };

        await expect(workerQuery({ id: 123 })).resolves.toEqual({ value: 456 });
      });

      it("should correctly infer client query signature", async () => {
        const queryDef = {
          input: z.object({ id: z.string().transform(Number) }),
          output: z.object({ value: z.number().transform(String) }),
        } satisfies QueryDefinition;

        type ClientHandler = ClientInferQuery<typeof queryDef>;
        const clientQuery: ClientHandler = (args: ClientInferInput<typeof queryDef>) => {
          expect(args.id).toBe("123");
          return Future.value(Result.Ok({ value: "456" }));
        };

        const result = await clientQuery({ id: "123" }).toPromise();
        expect(result.isOk()).toBe(true);
        if (result.isOk()) {
          expect(result.value).toEqual({ value: "456" });
        }
      });

      it("should correctly infer worker update signature", async () => {
        const updateDef = {
          input: z.object({ value: z.string().transform(Number) }),
          output: z.object({ result: z.number().transform(String) }),
        } satisfies UpdateDefinition;

        type WorkerHandler = WorkerInferUpdate<typeof updateDef>;
        const workerUpdate: WorkerHandler = async (args: WorkerInferInput<typeof updateDef>) => {
          expect(args.value).toBe(10);
          return { result: 20 };
        };

        await expect(workerUpdate({ value: 10 })).resolves.toEqual({ result: 20 });
      });

      it("should correctly infer client update signature", async () => {
        const updateDef = {
          input: z.object({ value: z.string().transform(Number) }),
          output: z.object({ result: z.number().transform(String) }),
        } satisfies UpdateDefinition;

        type ClientHandler = ClientInferUpdate<typeof updateDef>;
        const clientUpdate: ClientHandler = (args: ClientInferInput<typeof updateDef>) => {
          expect(args.value).toBe("10");
          return Future.value(Result.Ok({ result: "20" }));
        };

        const result = await clientUpdate({ value: "10" }).toPromise();
        expect(result.isOk()).toBe(true);
        if (result.isOk()) {
          expect(result.value).toEqual({ result: "20" });
        }
      });

      it("should correctly infer worker activity signature", async () => {
        const activityDef = {
          input: z.object({ amount: z.string().transform(Number) }),
          output: z.object({ total: z.number().transform(String) }),
        } satisfies ActivityDefinition;

        type WorkerFn = WorkerInferActivity<typeof activityDef>;
        const workerActivity: WorkerFn = async (args: WorkerInferInput<typeof activityDef>) => {
          expect(args.amount).toBe(100);
          return { total: 200 };
        };

        await expect(workerActivity({ amount: 100 })).resolves.toEqual({ total: 200 });
      });

      it("should correctly infer client activity signature", async () => {
        const activityDef = {
          input: z.object({ amount: z.string().transform(Number) }),
          output: z.object({ total: z.number().transform(String) }),
        } satisfies ActivityDefinition;

        type ClientFn = ClientInferActivity<typeof activityDef>;
        const clientActivity: ClientFn = async (args: ClientInferInput<typeof activityDef>) => {
          expect(args.amount).toBe("100");
          return { total: "200" };
        };

        await expect(clientActivity({ amount: "100" })).resolves.toEqual({ total: "200" });
      });
    });
  });

  describe("Activity Handler Utility Types", () => {
    it("should correctly type a global activity handler", async () => {
      const contract = {
        taskQueue: "test",
        activities: {
          log: {
            input: z.object({ level: z.string(), message: z.string() }),
            output: z.void(),
          },
          sendEmail: {
            input: z.object({ to: z.string(), subject: z.string() }),
            output: z.object({ messageId: z.string() }),
          },
        },
        workflows: {},
      } satisfies ContractDefinition;

      const log: ActivityHandler<typeof contract, "log"> = async ({ level, message }) => {
        expect(level).toBe("info");
        expect(message).toBe("test");
      };

      const sendEmail: ActivityHandler<typeof contract, "sendEmail"> = async ({ to, subject }) => {
        expect(to).toBe("user@example.com");
        expect(subject).toBe("Test");
        return { messageId: "123" };
      };

      await expect(log({ level: "info", message: "test" })).resolves.toBeUndefined();
      await expect(sendEmail({ to: "user@example.com", subject: "Test" })).resolves.toEqual({
        messageId: "123",
      });
    });

    it("should correctly type a workflow-specific activity handler", async () => {
      const contract = {
        taskQueue: "test",
        workflows: {
          processOrder: {
            input: z.object({ orderId: z.string() }),
            output: z.object({ success: z.boolean() }),
            activities: {
              processPayment: {
                input: z.object({ customerId: z.string(), amount: z.number() }),
                output: z.object({
                  transactionId: z.string(),
                  status: z.enum(["success", "failed"]),
                  paidAmount: z.number(),
                }),
              },
              reserveInventory: {
                input: z.array(z.object({ productId: z.string(), quantity: z.number() })),
                output: z.object({ reserved: z.boolean(), reservationId: z.string() }),
              },
            },
          },
        },
      } satisfies ContractDefinition;

      const processPayment: WorkflowActivityHandler<
        typeof contract,
        "processOrder",
        "processPayment"
      > = async ({ customerId, amount }) => {
        expect(customerId).toBe("cust123");
        expect(amount).toBe(100);
        return {
          transactionId: "txn123",
          status: "success" as const,
          paidAmount: amount,
        };
      };

      const reserveInventory: WorkflowActivityHandler<
        typeof contract,
        "processOrder",
        "reserveInventory"
      > = async (items) => {
        expect(items).toHaveLength(2);
        return {
          reserved: true,
          reservationId: "res123",
        };
      };

      await expect(processPayment({ customerId: "cust123", amount: 100 })).resolves.toEqual({
        transactionId: "txn123",
        status: "success",
        paidAmount: 100,
      });

      await expect(
        reserveInventory([
          { productId: "prod1", quantity: 2 },
          { productId: "prod2", quantity: 3 },
        ]),
      ).resolves.toEqual({
        reserved: true,
        reservationId: "res123",
      });
    });
  });

  describe("Utility Type Helpers", () => {
    it("should infer workflow names correctly", () => {
      const contract = {
        taskQueue: "test-queue",
        workflows: {
          processOrder: {
            input: z.object({ orderId: z.string() }),
            output: z.object({ status: z.string() }),
          },
          sendNotification: {
            input: z.object({ userId: z.string() }),
            output: z.object({ sent: z.boolean() }),
          },
        },
      } satisfies ContractDefinition;

      // This should compile without errors
      type WorkflowNames = import("./types.js").InferWorkflowNames<typeof contract>;
      const workflowName: WorkflowNames = "processOrder";
      const workflowName2: WorkflowNames = "sendNotification";

      expect(workflowName).toBe("processOrder");
      expect(workflowName2).toBe("sendNotification");

      // @ts-expect-error Invalid workflow name
      const _invalidWorkflow: WorkflowNames = "nonExistent";
    });

    it("should infer activity names correctly", () => {
      const contract = {
        taskQueue: "test-queue",
        workflows: {
          test: {
            input: z.object({}),
            output: z.object({}),
          },
        },
        activities: {
          sendEmail: {
            input: z.object({ to: z.string() }),
            output: z.object({ sent: z.boolean() }),
          },
          logEvent: {
            input: z.object({ event: z.string() }),
            output: z.object({ logged: z.boolean() }),
          },
        },
      } satisfies ContractDefinition;

      type ActivityNames = import("./types.js").InferActivityNames<typeof contract>;
      const activityName: ActivityNames = "sendEmail";
      const activityName2: ActivityNames = "logEvent";

      expect(activityName).toBe("sendEmail");
      expect(activityName2).toBe("logEvent");

      // @ts-expect-error Invalid activity name
      const _invalidActivity: ActivityNames = "nonExistent";
    });

    it("should infer contract workflows type correctly", () => {
      const contract = {
        taskQueue: "test-queue",
        workflows: {
          processOrder: {
            input: z.object({ orderId: z.string() }),
            output: z.object({ status: z.string() }),
          },
        },
      } satisfies ContractDefinition;

      type Workflows = import("./types.js").InferContractWorkflows<typeof contract>;
      type ProcessOrder = Workflows["processOrder"];

      // Should have input and output properties
      const workflow: ProcessOrder = {
        input: z.object({ orderId: z.string() }),
        output: z.object({ status: z.string() }),
      };

      expect(workflow.input).toBeDefined();
      expect(workflow.output).toBeDefined();
    });
  });
});
