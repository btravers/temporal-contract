import { describe, it, expect, vi, beforeEach } from "vitest";
import { z } from "zod";
import { defineContract } from "@temporal-contract/contract";
import { TypedClient } from "./client.js";
import { WorkflowNotFoundError, WorkflowValidationError } from "./errors.js";

// Create mock workflow object
const createMockWorkflow = () => ({
  start: vi.fn(),
  execute: vi.fn(),
  getHandle: vi.fn(),
});

// Mock Temporal Client
const mockWorkflow = createMockWorkflow();

vi.mock("@temporalio/client", () => ({
  Client: class {
    workflow = mockWorkflow;
  },
  WorkflowHandle: vi.fn(),
}));

describe("TypedClient", () => {
  const testContract = defineContract({
    taskQueue: "test-queue",
    workflows: {
      testWorkflow: {
        input: z.object({ name: z.string(), value: z.number() }),
        output: z.object({ result: z.string() }),
        queries: {
          getStatus: {
            input: z.tuple([]),
            output: z.string(),
          },
        },
        signals: {
          updateProgress: {
            input: z.tuple([z.number()]),
          },
        },
        updates: {
          setConfig: {
            input: z.tuple([z.object({ value: z.string() })]),
            output: z.boolean(),
          },
        },
      },
      simpleWorkflow: {
        input: z.object({ message: z.string() }),
        output: z.string(),
      },
    },
  });

  let typedClient: TypedClient<typeof testContract>;

  beforeEach(() => {
    vi.clearAllMocks();
    typedClient = TypedClient.create(testContract, { namespace: "default" });
  });

  describe("TypedClient.create", () => {
    it("should create a typed client instance", () => {
      expect(typedClient).toBeInstanceOf(TypedClient);
    });
  });

  describe("startWorkflow", () => {
    it("should start a workflow with valid input and return Ok result", async () => {
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

      const future = typedClient.startWorkflow("testWorkflow", {
        workflowId: "test-123",
        args: { name: "hello", value: 42 },
      });

      const result = await future;

      expect(result.isOk()).toBe(true);
      expect(mockWorkflow.start).toHaveBeenCalledWith("testWorkflow", {
        workflowId: "test-123",
        taskQueue: "test-queue",
        args: [{ name: "hello", value: 42 }],
      });

      if (result.isOk()) {
        expect(result.value.workflowId).toBe("test-123");
      }
    });

    it("should return Error result for invalid input", async () => {
      const future = typedClient.startWorkflow("testWorkflow", {
        workflowId: "test-123",
        args: { name: "hello", value: "not-a-number" as unknown as number },
      });

      const result = await future;

      expect(result.isError()).toBe(true);
      if (result.isError()) {
        expect(result.error).toBeInstanceOf(WorkflowValidationError);
      }
    });

    it("should return Error result for non-existent workflow", async () => {
      const future = typedClient.startWorkflow("nonExistentWorkflow" as unknown as "testWorkflow", {
        workflowId: "test-123",
        args: {} as unknown as { name: string; value: number },
      });

      const result = await future;

      expect(result.isError()).toBe(true);
      if (result.isError()) {
        expect(result.error).toBeInstanceOf(WorkflowNotFoundError);
      }
    });
  });

  describe("executeWorkflow", () => {
    it("should execute a workflow with valid input and return Ok result", async () => {
      mockWorkflow.execute.mockResolvedValue({ result: "success" });

      const future = typedClient.executeWorkflow("testWorkflow", {
        workflowId: "test-123",
        args: { name: "hello", value: 42 },
      });

      const result = await future;

      expect(result.isOk()).toBe(true);
      expect(mockWorkflow.execute).toHaveBeenCalledWith("testWorkflow", {
        workflowId: "test-123",
        taskQueue: "test-queue",
        args: [{ name: "hello", value: 42 }],
      });

      if (result.isOk()) {
        expect(result.value).toEqual({ result: "success" });
      }
    });

    it("should return Error result for invalid output", async () => {
      mockWorkflow.execute.mockResolvedValue({ wrong: "output" });

      const future = typedClient.executeWorkflow("testWorkflow", {
        workflowId: "test-123",
        args: { name: "hello", value: 42 },
      });

      const result = await future;

      expect(result.isError()).toBe(true);
      if (result.isError()) {
        expect(result.error).toBeInstanceOf(WorkflowValidationError);
      }
    });

    it("should return Error result when workflow execution throws", async () => {
      mockWorkflow.execute.mockRejectedValue(new Error("Workflow execution failed"));

      const future = typedClient.executeWorkflow("testWorkflow", {
        workflowId: "test-123",
        args: { name: "hello", value: 42 },
      });

      const result = await future;

      expect(result.isError()).toBe(true);
    });
  });

  describe("getHandle", () => {
    it("should get a workflow handle and return Ok result", async () => {
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

      const future = typedClient.getHandle("testWorkflow", "test-123");
      const result = await future;

      expect(result.isOk()).toBe(true);
      if (result.isOk()) {
        expect(result.value.workflowId).toBe("test-123");
      }
    });

    it("should return Error result for non-existent workflow", async () => {
      const future = typedClient.getHandle(
        "nonExistentWorkflow" as unknown as "testWorkflow",
        "test-123",
      );
      const result = await future;

      expect(result.isError()).toBe(true);
      if (result.isError()) {
        expect(result.error).toBeInstanceOf(WorkflowNotFoundError);
      }
    });
  });

  describe("TypedWorkflowHandle", () => {
    interface MockHandle {
      workflowId: string;
      result: ReturnType<typeof vi.fn>;
      query: ReturnType<typeof vi.fn>;
      signal: ReturnType<typeof vi.fn>;
      executeUpdate: ReturnType<typeof vi.fn>;
      terminate: ReturnType<typeof vi.fn>;
      cancel: ReturnType<typeof vi.fn>;
      describe: ReturnType<typeof vi.fn>;
      fetchHistory: ReturnType<typeof vi.fn>;
    }

    let mockHandle: MockHandle;

    beforeEach(() => {
      mockHandle = {
        workflowId: "test-123",
        result: vi.fn().mockResolvedValue({ result: "success" }),
        query: vi.fn(),
        signal: vi.fn(),
        executeUpdate: vi.fn(),
        terminate: vi.fn(),
        cancel: vi.fn(),
        describe: vi.fn().mockResolvedValue({
          workflowId: "test-123",
          type: "testWorkflow",
          status: { name: "RUNNING" },
        }),
        fetchHistory: vi.fn(),
      };

      mockWorkflow.start.mockResolvedValue(mockHandle);
    });

    it("should call result() with Result pattern", async () => {
      const handleFuture = typedClient.startWorkflow("testWorkflow", {
        workflowId: "test-123",
        args: { name: "hello", value: 42 },
      });

      const handleResult = await handleFuture;
      expect(handleResult.isOk()).toBe(true);

      if (handleResult.isOk()) {
        const resultFuture = handleResult.value.result();
        const result = await resultFuture;

        expect(result.isOk()).toBe(true);
        if (result.isOk()) {
          expect(result.value).toEqual({ result: "success" });
        }
      }
    });

    it("should call queries with Result pattern", async () => {
      mockHandle.query.mockResolvedValue("running");

      const handleFuture = typedClient.startWorkflow("testWorkflow", {
        workflowId: "test-123",
        args: { name: "hello", value: 42 },
      });

      const handleResult = await handleFuture;
      expect(handleResult.isOk()).toBe(true);

      if (handleResult.isOk()) {
        const queryFuture = handleResult.value.queries.getStatus([]);
        const result = await queryFuture;

        expect(result.isOk()).toBe(true);
        if (result.isOk()) {
          expect(result.value).toBe("running");
        }
      }
    });

    it("should call signals with Result pattern", async () => {
      const handleFuture = typedClient.startWorkflow("testWorkflow", {
        workflowId: "test-123",
        args: { name: "hello", value: 42 },
      });

      const handleResult = await handleFuture;
      expect(handleResult.isOk()).toBe(true);

      if (handleResult.isOk()) {
        const signalFuture = handleResult.value.signals.updateProgress([50]);
        const result = await signalFuture;

        expect(result.isOk()).toBe(true);
        expect(mockHandle.signal).toHaveBeenCalledWith("updateProgress", [50]);
      }
    });

    it("should call updates with Result pattern", async () => {
      mockHandle.executeUpdate.mockResolvedValue(true);

      const handleFuture = typedClient.startWorkflow("testWorkflow", {
        workflowId: "test-123",
        args: { name: "hello", value: 42 },
      });

      const handleResult = await handleFuture;
      expect(handleResult.isOk()).toBe(true);

      if (handleResult.isOk()) {
        const updateFuture = handleResult.value.updates.setConfig([{ value: "new-config" }]);
        const result = await updateFuture;

        expect(result.isOk()).toBe(true);
        if (result.isOk()) {
          expect(result.value).toBe(true);
        }
      }
    });

    it("should call terminate with Result pattern", async () => {
      const handleFuture = typedClient.startWorkflow("testWorkflow", {
        workflowId: "test-123",
        args: { name: "hello", value: 42 },
      });

      const handleResult = await handleFuture;
      expect(handleResult.isOk()).toBe(true);

      if (handleResult.isOk()) {
        const terminateFuture = handleResult.value.terminate("test reason");
        const result = await terminateFuture;

        expect(result.isOk()).toBe(true);
        expect(mockHandle.terminate).toHaveBeenCalledWith("test reason");
      }
    });

    it("should call cancel with Result pattern", async () => {
      const handleFuture = typedClient.startWorkflow("testWorkflow", {
        workflowId: "test-123",
        args: { name: "hello", value: 42 },
      });

      const handleResult = await handleFuture;
      expect(handleResult.isOk()).toBe(true);

      if (handleResult.isOk()) {
        const cancelFuture = handleResult.value.cancel();
        const result = await cancelFuture;

        expect(result.isOk()).toBe(true);
        expect(mockHandle.cancel).toHaveBeenCalled();
      }
    });

    it("should call describe with Result pattern", async () => {
      const handleFuture = typedClient.startWorkflow("testWorkflow", {
        workflowId: "test-123",
        args: { name: "hello", value: 42 },
      });

      const handleResult = await handleFuture;
      expect(handleResult.isOk()).toBe(true);

      if (handleResult.isOk()) {
        const describeFuture = handleResult.value.describe();
        const result = await describeFuture;

        expect(result.isOk()).toBe(true);
        if (result.isOk()) {
          expect(result.value.workflowId).toBe("test-123");
        }
      }
    });
  });

  describe("Result pattern matching", () => {
    it("should support match() on results", async () => {
      mockWorkflow.execute.mockResolvedValue({ result: "success" });

      const future = typedClient.executeWorkflow("testWorkflow", {
        workflowId: "test-123",
        args: { name: "hello", value: 42 },
      });

      const result = await future;

      let matched = false;
      result.match({
        Ok: (value) => {
          matched = true;
          expect(value).toEqual({ result: "success" });
        },
        Error: () => {
          throw new Error("Should not be called");
        },
      });

      expect(matched).toBe(true);
    });

    it("should support map() on Ok results", async () => {
      mockWorkflow.execute.mockResolvedValue({ result: "success" });

      const future = typedClient.executeWorkflow("testWorkflow", {
        workflowId: "test-123",
        args: { name: "hello", value: 42 },
      });

      const result = await future;
      const mapped = result.map((value) => value.result.toUpperCase());

      expect(mapped.isOk()).toBe(true);
      if (mapped.isOk()) {
        expect(mapped.value).toBe("SUCCESS");
      }
    });
  });
});
