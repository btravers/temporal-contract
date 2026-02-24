import { beforeEach, describe, expect, it, vi } from "vitest";
import { Schema, Effect, Exit, Cause } from "effect";
import { defineEffectContract } from "@temporal-contract/contract-effect";
import { Client } from "@temporalio/client";
import { EffectTypedClient } from "./client.js";
import { RuntimeClientError, WorkflowNotFoundError, WorkflowValidationError } from "./errors.js";

const createMockWorkflow = () => ({
  start: vi.fn(),
  execute: vi.fn(),
  getHandle: vi.fn(),
});

const mockWorkflow = createMockWorkflow();

vi.mock("@temporalio/client", () => ({
  WorkflowHandle: vi.fn(),
  Client: vi.fn(),
  Connection: vi.fn(),
}));

const testContract = defineEffectContract({
  taskQueue: "test-queue",
  workflows: {
    testWorkflow: {
      input: Schema.Struct({ name: Schema.String, value: Schema.Number }),
      output: Schema.Struct({ result: Schema.String }),
      queries: {
        getStatus: {
          input: Schema.Tuple(),
          output: Schema.String,
        },
      },
      signals: {
        updateProgress: {
          input: Schema.Tuple(Schema.Number),
        },
      },
      updates: {
        setConfig: {
          input: Schema.Tuple(Schema.Struct({ value: Schema.String })),
          output: Schema.Boolean,
        },
      },
    },
    simpleWorkflow: {
      input: Schema.Struct({ message: Schema.String }),
      output: Schema.String,
    },
  },
});

describe("EffectTypedClient", () => {
  let typedClient: EffectTypedClient<typeof testContract>;

  beforeEach(() => {
    vi.clearAllMocks();
    const rawClient = { workflow: mockWorkflow } as unknown as Client;
    typedClient = EffectTypedClient.create(testContract, rawClient);
  });

  describe("EffectTypedClient.create", () => {
    it("should create a typed client instance", () => {
      expect(typedClient).toBeInstanceOf(EffectTypedClient);
    });
  });

  describe("executeWorkflow", () => {
    it("should execute a workflow with valid input and succeed", async () => {
      mockWorkflow.execute.mockResolvedValue({ result: "success" });

      const result = await Effect.runPromise(
        typedClient.executeWorkflow("testWorkflow", {
          workflowId: "test-123",
          args: { name: "hello", value: 42 },
        }),
      );

      expect(result).toEqual({ result: "success" });
      expect(mockWorkflow.execute).toHaveBeenCalledWith("testWorkflow", {
        workflowId: "test-123",
        taskQueue: "test-queue",
        args: [{ name: "hello", value: 42 }],
      });
    });

    it("should fail with WorkflowValidationError for invalid input", async () => {
      const exit = await Effect.runPromiseExit(
        typedClient.executeWorkflow("testWorkflow", {
          workflowId: "test-123",
          // @ts-expect-error intentionally wrong type
          args: { name: "hello", value: "not-a-number" },
        }),
      );

      expect(Exit.isFailure(exit)).toBe(true);
      if (Exit.isFailure(exit)) {
        const error = Cause.failureOption(exit.cause);
        expect(error._tag).toBe("Some");
        if (error._tag === "Some") {
          expect(error.value._tag).toBe("WorkflowValidationError");
          expect(error.value).toBeInstanceOf(WorkflowValidationError);
        }
      }
    });

    it("should fail with WorkflowValidationError for invalid output", async () => {
      mockWorkflow.execute.mockResolvedValue({ wrong: "output" });

      const exit = await Effect.runPromiseExit(
        typedClient.executeWorkflow("testWorkflow", {
          workflowId: "test-123",
          args: { name: "hello", value: 42 },
        }),
      );

      expect(Exit.isFailure(exit)).toBe(true);
      if (Exit.isFailure(exit)) {
        const error = Cause.failureOption(exit.cause);
        if (error._tag === "Some") {
          expect(error.value._tag).toBe("WorkflowValidationError");
          const e = error.value as WorkflowValidationError;
          expect(e.direction).toBe("output");
        }
      }
    });

    it("should fail with WorkflowNotFoundError for unknown workflow", async () => {
      const exit = await Effect.runPromiseExit(
        typedClient.executeWorkflow("nonExistentWorkflow" as unknown as "testWorkflow", {
          workflowId: "test-123",
          args: {} as { name: string; value: number },
        }),
      );

      expect(Exit.isFailure(exit)).toBe(true);
      if (Exit.isFailure(exit)) {
        const error = Cause.failureOption(exit.cause);
        if (error._tag === "Some") {
          expect(error.value._tag).toBe("WorkflowNotFoundError");
          expect(error.value).toBeInstanceOf(WorkflowNotFoundError);
        }
      }
    });

    it("should fail with RuntimeClientError when workflow execution throws", async () => {
      mockWorkflow.execute.mockRejectedValue(new Error("Workflow execution failed"));

      const exit = await Effect.runPromiseExit(
        typedClient.executeWorkflow("testWorkflow", {
          workflowId: "test-123",
          args: { name: "hello", value: 42 },
        }),
      );

      expect(Exit.isFailure(exit)).toBe(true);
      if (Exit.isFailure(exit)) {
        const error = Cause.failureOption(exit.cause);
        if (error._tag === "Some") {
          expect(error.value._tag).toBe("RuntimeClientError");
          expect(error.value).toBeInstanceOf(RuntimeClientError);
        }
      }
    });

    it("should support Effect.catchTag for typed error handling", async () => {
      mockWorkflow.execute.mockRejectedValue(new Error("failed"));

      const result = await Effect.runPromise(
        Effect.catchTag(
          typedClient.executeWorkflow("testWorkflow", {
            workflowId: "test-123",
            args: { name: "hello", value: 42 },
          }),
          "RuntimeClientError",
          (_e) => Effect.succeed({ result: "fallback" }),
        ),
      );

      expect(result).toEqual({ result: "fallback" });
    });
  });

  describe("startWorkflow", () => {
    it("should start a workflow and return a typed handle", async () => {
      const mockHandle = {
        workflowId: "test-123",
        result: vi.fn().mockResolvedValue({ result: "success" }),
        query: vi.fn(),
        signal: vi.fn(),
        executeUpdate: vi.fn(),
        terminate: vi.fn(),
        cancel: vi.fn(),
        describe: vi.fn(),
        fetchHistory: vi.fn(),
      };

      mockWorkflow.start.mockResolvedValue(mockHandle);

      const handle = await Effect.runPromise(
        typedClient.startWorkflow("testWorkflow", {
          workflowId: "test-123",
          args: { name: "hello", value: 42 },
        }),
      );

      expect(handle.workflowId).toBe("test-123");
      expect(mockWorkflow.start).toHaveBeenCalledWith("testWorkflow", {
        workflowId: "test-123",
        taskQueue: "test-queue",
        args: [{ name: "hello", value: 42 }],
      });
    });

    it("should fail with WorkflowNotFoundError for unknown workflow", async () => {
      const exit = await Effect.runPromiseExit(
        typedClient.startWorkflow("nonExistentWorkflow" as unknown as "testWorkflow", {
          workflowId: "test-123",
          args: {} as { name: string; value: number },
        }),
      );

      expect(Exit.isFailure(exit)).toBe(true);
      if (Exit.isFailure(exit)) {
        const error = Cause.failureOption(exit.cause);
        if (error._tag === "Some") {
          expect(error.value._tag).toBe("WorkflowNotFoundError");
        }
      }
    });
  });

  describe("getHandle", () => {
    it("should get a handle for an existing workflow", async () => {
      const mockHandle = {
        workflowId: "test-123",
        result: vi.fn().mockResolvedValue({ result: "success" }),
        query: vi.fn(),
        signal: vi.fn(),
        executeUpdate: vi.fn(),
        terminate: vi.fn(),
        cancel: vi.fn(),
        describe: vi.fn(),
        fetchHistory: vi.fn(),
      };

      mockWorkflow.getHandle.mockReturnValue(mockHandle);

      const handle = await Effect.runPromise(typedClient.getHandle("testWorkflow", "test-123"));

      expect(handle.workflowId).toBe("test-123");
    });

    it("should fail with WorkflowNotFoundError for unknown workflow", async () => {
      const exit = await Effect.runPromiseExit(
        typedClient.getHandle("nonExistentWorkflow" as unknown as "testWorkflow", "test-123"),
      );

      expect(Exit.isFailure(exit)).toBe(true);
      if (Exit.isFailure(exit)) {
        const error = Cause.failureOption(exit.cause);
        if (error._tag === "Some") {
          expect(error.value._tag).toBe("WorkflowNotFoundError");
        }
      }
    });
  });

  describe("EffectTypedWorkflowHandle", () => {
    type MockHandle = {
      workflowId: string;
      result: ReturnType<typeof vi.fn>;
      query: ReturnType<typeof vi.fn>;
      signal: ReturnType<typeof vi.fn>;
      executeUpdate: ReturnType<typeof vi.fn>;
      terminate: ReturnType<typeof vi.fn>;
      cancel: ReturnType<typeof vi.fn>;
      describe: ReturnType<typeof vi.fn>;
      fetchHistory: ReturnType<typeof vi.fn>;
    };

    let mockHandle: MockHandle;

    beforeEach(() => {
      mockHandle = {
        workflowId: "test-123",
        result: vi.fn().mockResolvedValue({ result: "success" }),
        query: vi.fn(),
        signal: vi.fn().mockResolvedValue(undefined),
        executeUpdate: vi.fn().mockResolvedValue(true),
        terminate: vi.fn().mockResolvedValue(undefined),
        cancel: vi.fn().mockResolvedValue(undefined),
        describe: vi.fn().mockResolvedValue({
          workflowId: "test-123",
          type: "testWorkflow",
          status: { name: "RUNNING" },
        }),
        fetchHistory: vi.fn().mockResolvedValue({ events: [] }),
      };

      mockWorkflow.start.mockResolvedValue(mockHandle);
    });

    it("should call result() as an Effect", async () => {
      const handle = await Effect.runPromise(
        typedClient.startWorkflow("testWorkflow", {
          workflowId: "test-123",
          args: { name: "hello", value: 42 },
        }),
      );

      const result = await Effect.runPromise(handle.result());
      expect(result).toEqual({ result: "success" });
    });

    it("should call queries as Effects", async () => {
      mockHandle.query.mockResolvedValue("running");

      const handle = await Effect.runPromise(
        typedClient.startWorkflow("testWorkflow", {
          workflowId: "test-123",
          args: { name: "hello", value: 42 },
        }),
      );

      const status = await Effect.runPromise(handle.queries.getStatus([]));
      expect(status).toBe("running");
    });

    it("should call signals as Effects", async () => {
      const handle = await Effect.runPromise(
        typedClient.startWorkflow("testWorkflow", {
          workflowId: "test-123",
          args: { name: "hello", value: 42 },
        }),
      );

      await Effect.runPromise(handle.signals.updateProgress([50]));
      expect(mockHandle.signal).toHaveBeenCalledWith("updateProgress", [50]);
    });

    it("should call updates as Effects", async () => {
      mockHandle.executeUpdate.mockResolvedValue(true);

      const handle = await Effect.runPromise(
        typedClient.startWorkflow("testWorkflow", {
          workflowId: "test-123",
          args: { name: "hello", value: 42 },
        }),
      );

      const updated = await Effect.runPromise(handle.updates.setConfig([{ value: "new-config" }]));
      expect(updated).toBe(true);
    });

    it("should call terminate as an Effect", async () => {
      const handle = await Effect.runPromise(
        typedClient.startWorkflow("testWorkflow", {
          workflowId: "test-123",
          args: { name: "hello", value: 42 },
        }),
      );

      await Effect.runPromise(handle.terminate("test reason"));
      expect(mockHandle.terminate).toHaveBeenCalledWith("test reason");
    });

    it("should call cancel as an Effect", async () => {
      const handle = await Effect.runPromise(
        typedClient.startWorkflow("testWorkflow", {
          workflowId: "test-123",
          args: { name: "hello", value: 42 },
        }),
      );

      await Effect.runPromise(handle.cancel());
      expect(mockHandle.cancel).toHaveBeenCalled();
    });

    it("should call describe as an Effect", async () => {
      const handle = await Effect.runPromise(
        typedClient.startWorkflow("testWorkflow", {
          workflowId: "test-123",
          args: { name: "hello", value: 42 },
        }),
      );

      const description = await Effect.runPromise(handle.describe());
      expect(description).toEqual(expect.objectContaining({ workflowId: "test-123" }));
    });
  });

  describe("Effect.catchTag pattern matching", () => {
    it("should allow catching specific error tags", async () => {
      const exit = await Effect.runPromiseExit(
        Effect.catchTags(
          typedClient.executeWorkflow("testWorkflow", {
            workflowId: "test-123",
            // @ts-expect-error intentionally wrong type
            args: { name: 123, value: "bad" },
          }),
          {
            WorkflowValidationError: (_e) => Effect.succeed({ result: "validation-fallback" }),
            WorkflowNotFoundError: (_e) => Effect.succeed({ result: "not-found-fallback" }),
            RuntimeClientError: (_e) => Effect.succeed({ result: "runtime-fallback" }),
          },
        ),
      );

      expect(Exit.isSuccess(exit)).toBe(true);
      if (Exit.isSuccess(exit)) {
        expect(exit.value).toEqual({ result: "validation-fallback" });
      }
    });

    it("WorkflowNotFoundError has correct fields", async () => {
      const exit = await Effect.runPromiseExit(
        typedClient.executeWorkflow("nonExistentWorkflow" as unknown as "testWorkflow", {
          workflowId: "test-123",
          args: {} as { name: string; value: number },
        }),
      );

      if (Exit.isFailure(exit)) {
        const error = Cause.failureOption(exit.cause);
        if (error._tag === "Some" && error.value._tag === "WorkflowNotFoundError") {
          const e = error.value as WorkflowNotFoundError;
          expect(e.workflowName).toBe("nonExistentWorkflow");
          expect(e.availableWorkflows).toContain("testWorkflow");
        }
      }
    });
  });
});
