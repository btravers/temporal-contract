import { describe, it, expect, vi, beforeEach } from "vitest";
import { z } from "zod";
import { defineContract } from "@temporal-contract/contract";
import { TypedClient } from "./client.js";
import {
  WorkflowNotFoundError,
  WorkflowValidationError,
  QueryValidationError,
  SignalValidationError,
  UpdateValidationError,
} from "./errors.js";

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
        input: z.tuple([z.string(), z.number()]),
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
        input: z.tuple([z.string()]),
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
    it("should start a workflow with valid input", async () => {
      const mockHandle = {
        workflowId: "test-123",
        result: vi.fn().mockResolvedValue({ result: "success" }),
        query: vi.fn(),
        signal: vi.fn(),
        executeUpdate: vi.fn(),
        terminate: vi.fn(),
        cancel: vi.fn(),
      };

      mockWorkflow.start.mockResolvedValue(mockHandle);

      const handle = await typedClient.startWorkflow("testWorkflow", {
        workflowId: "test-123",
        args: ["hello", 42],
      });

      expect(mockWorkflow.start).toHaveBeenCalledWith("testWorkflow", {
        workflowId: "test-123",
        taskQueue: "test-queue",
        args: [["hello", 42]],
      });

      expect(handle.workflowId).toBe("test-123");
    });

    it("should throw WorkflowNotFoundError for unknown workflow", async () => {
      await expect(
        // @ts-expect-error Testing invalid workflow name
        typedClient.startWorkflow("unknownWorkflow", {
          workflowId: "test-123",
          args: ["test"],
        }),
      ).rejects.toThrow(WorkflowNotFoundError);
    });

    it("should throw WorkflowValidationError for invalid input", async () => {
      await expect(
        typedClient.startWorkflow("testWorkflow", {
          workflowId: "test-123",
          // @ts-expect-error Testing invalid input
          args: ["hello", "not-a-number"],
        }),
      ).rejects.toThrow(WorkflowValidationError);
    });

    it("should pass Temporal options to underlying client", async () => {
      const mockHandle = {
        workflowId: "test-123",
        result: vi.fn().mockResolvedValue({ result: "success" }),
        query: vi.fn(),
        signal: vi.fn(),
        executeUpdate: vi.fn(),
        terminate: vi.fn(),
        cancel: vi.fn(),
      };

      mockWorkflow.start.mockResolvedValue(mockHandle);

      await typedClient.startWorkflow("testWorkflow", {
        workflowId: "test-123",
        args: ["hello", 42],
        workflowExecutionTimeout: "1 day",
        retry: { maximumAttempts: 3 },
        memo: { userId: "user-123" },
      });

      expect(mockWorkflow.start).toHaveBeenCalledWith("testWorkflow", {
        workflowId: "test-123",
        taskQueue: "test-queue",
        args: [["hello", 42]],
        workflowExecutionTimeout: "1 day",
        retry: { maximumAttempts: 3 },
        memo: { userId: "user-123" },
      });
    });
  });

  describe("executeWorkflow", () => {
    it("should execute a workflow with valid input and output", async () => {
      mockWorkflow.execute.mockResolvedValue({ result: "success" });

      const result = await typedClient.executeWorkflow("testWorkflow", {
        workflowId: "test-123",
        args: ["hello", 42],
      });

      expect(mockWorkflow.execute).toHaveBeenCalledWith("testWorkflow", {
        workflowId: "test-123",
        taskQueue: "test-queue",
        args: [["hello", 42]],
      });

      expect(result).toEqual({ result: "success" });
    });

    it("should throw WorkflowNotFoundError for unknown workflow", async () => {
      await expect(
        // @ts-expect-error Testing invalid workflow name
        typedClient.executeWorkflow("unknownWorkflow", {
          workflowId: "test-123",
          args: ["test"],
        }),
      ).rejects.toThrow(WorkflowNotFoundError);
    });

    it("should throw WorkflowValidationError for invalid input", async () => {
      await expect(
        typedClient.executeWorkflow("testWorkflow", {
          workflowId: "test-123",
          // @ts-expect-error Testing invalid input
          args: ["hello", "not-a-number"],
        }),
      ).rejects.toThrow(WorkflowValidationError);
    });

    it("should throw WorkflowValidationError for invalid output", async () => {
      mockWorkflow.execute.mockResolvedValue({ wrongField: "value" });

      await expect(
        typedClient.executeWorkflow("testWorkflow", {
          workflowId: "test-123",
          args: ["hello", 42],
        }),
      ).rejects.toThrow(WorkflowValidationError);
    });

    it("should pass Temporal options to underlying client", async () => {
      mockWorkflow.execute.mockResolvedValue({ result: "success" });

      await typedClient.executeWorkflow("testWorkflow", {
        workflowId: "test-123",
        args: ["hello", 42],
        workflowExecutionTimeout: "1 day",
        cronSchedule: "0 0 * * *",
      });

      expect(mockWorkflow.execute).toHaveBeenCalledWith("testWorkflow", {
        workflowId: "test-123",
        taskQueue: "test-queue",
        args: [["hello", 42]],
        workflowExecutionTimeout: "1 day",
        cronSchedule: "0 0 * * *",
      });
    });
  });

  describe("getHandle", () => {
    it("should get a handle to an existing workflow", async () => {
      const mockHandle = {
        workflowId: "test-123",
        result: vi.fn().mockResolvedValue({ result: "success" }),
        query: vi.fn(),
        signal: vi.fn(),
        executeUpdate: vi.fn(),
        terminate: vi.fn(),
        cancel: vi.fn(),
      };

      mockWorkflow.getHandle.mockReturnValue(mockHandle);

      const handle = await typedClient.getHandle("testWorkflow", "test-123");

      expect(mockWorkflow.getHandle).toHaveBeenCalledWith("test-123");
      expect(handle.workflowId).toBe("test-123");
    });

    it("should throw WorkflowNotFoundError for unknown workflow", async () => {
      await expect(
        // @ts-expect-error Testing invalid workflow name
        typedClient.getHandle("unknownWorkflow", "test-123"),
      ).rejects.toThrow(WorkflowNotFoundError);
    });
  });

  describe("TypedWorkflowHandle", () => {
    let mockHandle: {
      workflowId: string;
      result: ReturnType<typeof vi.fn>;
      query: ReturnType<typeof vi.fn>;
      signal: ReturnType<typeof vi.fn>;
      executeUpdate: ReturnType<typeof vi.fn>;
      terminate: ReturnType<typeof vi.fn>;
      cancel: ReturnType<typeof vi.fn>;
      describe?: ReturnType<typeof vi.fn>;
      fetchHistory?: ReturnType<typeof vi.fn>;
    };

    beforeEach(async () => {
      mockHandle = {
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
    });

    describe("result", () => {
      it("should return validated workflow result", async () => {
        const handle = await typedClient.startWorkflow("testWorkflow", {
          workflowId: "test-123",
          args: ["hello", 42],
        });

        const result = await handle.result();

        expect(mockHandle.result).toHaveBeenCalled();
        expect(result).toEqual({ result: "success" });
      });

      it("should throw WorkflowValidationError for invalid output", async () => {
        mockHandle.result.mockResolvedValue({ wrongField: "value" });

        const handle = await typedClient.startWorkflow("testWorkflow", {
          workflowId: "test-123",
          args: ["hello", 42],
        });

        await expect(handle.result()).rejects.toThrow(WorkflowValidationError);
      });
    });

    describe("queries", () => {
      it("should execute typed query with valid input and output", async () => {
        mockHandle.query.mockResolvedValue("running");

        const handle = await typedClient.startWorkflow("testWorkflow", {
          workflowId: "test-123",
          args: ["hello", 42],
        });

        const status = await handle.queries.getStatus([]);

        expect(mockHandle.query).toHaveBeenCalledWith("getStatus", []);
        expect(status).toBe("running");
      });

      it("should throw QueryValidationError for invalid input", async () => {
        const handle = await typedClient.startWorkflow("testWorkflow", {
          workflowId: "test-123",
          args: ["hello", 42],
        });

        await expect(
          // @ts-expect-error Testing invalid query input
          handle.queries.getStatus(["invalid"]),
        ).rejects.toThrow(QueryValidationError);
      });

      it("should throw QueryValidationError for invalid output", async () => {
        mockHandle.query.mockResolvedValue(123);

        const handle = await typedClient.startWorkflow("testWorkflow", {
          workflowId: "test-123",
          args: ["hello", 42],
        });

        await expect(handle.queries.getStatus([])).rejects.toThrow(QueryValidationError);
      });
    });

    describe("signals", () => {
      it("should send typed signal with valid input", async () => {
        const handle = await typedClient.startWorkflow("testWorkflow", {
          workflowId: "test-123",
          args: ["hello", 42],
        });

        await handle.signals.updateProgress([50]);

        expect(mockHandle.signal).toHaveBeenCalledWith("updateProgress", [50]);
      });

      it("should throw SignalValidationError for invalid input", async () => {
        const handle = await typedClient.startWorkflow("testWorkflow", {
          workflowId: "test-123",
          args: ["hello", 42],
        });

        await expect(
          // @ts-expect-error Testing invalid signal input
          handle.signals.updateProgress(["not-a-number"]),
        ).rejects.toThrow(SignalValidationError);
      });
    });

    describe("updates", () => {
      it("should execute typed update with valid input and output", async () => {
        mockHandle.executeUpdate.mockResolvedValue(true);

        const handle = await typedClient.startWorkflow("testWorkflow", {
          workflowId: "test-123",
          args: ["hello", 42],
        });

        const result = await handle.updates.setConfig([{ value: "new-config" }]);

        expect(mockHandle.executeUpdate).toHaveBeenCalledWith("setConfig", {
          args: [[{ value: "new-config" }]],
        });
        expect(result).toBe(true);
      });

      it("should throw UpdateValidationError for invalid input", async () => {
        const handle = await typedClient.startWorkflow("testWorkflow", {
          workflowId: "test-123",
          args: ["hello", 42],
        });

        await expect(
          // @ts-expect-error Testing invalid update input
          handle.updates.setConfig([{ wrongField: "value" }]),
        ).rejects.toThrow(UpdateValidationError);
      });

      it("should throw UpdateValidationError for invalid output", async () => {
        mockHandle.executeUpdate.mockResolvedValue("not-a-boolean");

        const handle = await typedClient.startWorkflow("testWorkflow", {
          workflowId: "test-123",
          args: ["hello", 42],
        });

        await expect(handle.updates.setConfig([{ value: "new-config" }])).rejects.toThrow(
          UpdateValidationError,
        );
      });
    });

    describe("terminate", () => {
      it("should terminate workflow", async () => {
        const handle = await typedClient.startWorkflow("testWorkflow", {
          workflowId: "test-123",
          args: ["hello", 42],
        });

        await handle.terminate("test reason");

        expect(mockHandle.terminate).toHaveBeenCalledWith("test reason");
      });

      it("should terminate workflow without reason", async () => {
        const handle = await typedClient.startWorkflow("testWorkflow", {
          workflowId: "test-123",
          args: ["hello", 42],
        });

        await handle.terminate();

        expect(mockHandle.terminate).toHaveBeenCalledWith(undefined);
      });
    });

    describe("cancel", () => {
      it("should cancel workflow", async () => {
        const handle = await typedClient.startWorkflow("testWorkflow", {
          workflowId: "test-123",
          args: ["hello", 42],
        });

        await handle.cancel();

        expect(mockHandle.cancel).toHaveBeenCalled();
      });
    });

    describe("describe", () => {
      it("should call describe on underlying handle", async () => {
        const mockDescription = {
          workflowExecutionInfo: {
            workflowExecution: { workflowId: "test-123", runId: "run-123" },
            type: { name: "testWorkflow" },
            startTime: new Date(),
            status: "RUNNING" as const,
          },
        };

        mockHandle.describe = vi.fn().mockResolvedValue(mockDescription);

        const handle = await typedClient.startWorkflow("testWorkflow", {
          workflowId: "test-123",
          args: ["hello", 42],
        });

        const description = await handle.describe();

        expect(mockHandle.describe).toHaveBeenCalled();
        expect(description).toEqual(mockDescription);
      });
    });

    describe("fetchHistory", () => {
      it("should call fetchHistory on underlying handle", async () => {
        const mockHistoryIterator = (async function* () {
          yield { eventId: 1n, eventType: "WorkflowExecutionStarted" };
          yield { eventId: 2n, eventType: "WorkflowTaskScheduled" };
        })();

        mockHandle.fetchHistory = vi.fn().mockReturnValue(mockHistoryIterator);

        const handle = await typedClient.startWorkflow("testWorkflow", {
          workflowId: "test-123",
          args: ["hello", 42],
        });

        const history = handle.fetchHistory();

        expect(mockHandle.fetchHistory).toHaveBeenCalled();
        expect(history).toBeDefined();
      });
    });
  });

  describe("edge cases", () => {
    it("should handle workflow with no queries", async () => {
      const mockHandle = {
        workflowId: "simple-123",
        result: vi.fn().mockResolvedValue("done"),
        query: vi.fn(),
        signal: vi.fn(),
        executeUpdate: vi.fn(),
        terminate: vi.fn(),
        cancel: vi.fn(),
      };

      mockWorkflow.start.mockResolvedValue(mockHandle);

      const handle = await typedClient.startWorkflow("simpleWorkflow", {
        workflowId: "simple-123",
        args: ["test"],
      });

      expect(handle.queries).toBeDefined();
      expect(Object.keys(handle.queries)).toHaveLength(0);
    });

    it("should handle workflow with no signals", async () => {
      const mockHandle = {
        workflowId: "simple-123",
        result: vi.fn().mockResolvedValue("done"),
        query: vi.fn(),
        signal: vi.fn(),
        executeUpdate: vi.fn(),
        terminate: vi.fn(),
        cancel: vi.fn(),
      };

      mockWorkflow.start.mockResolvedValue(mockHandle);

      const handle = await typedClient.startWorkflow("simpleWorkflow", {
        workflowId: "simple-123",
        args: ["test"],
      });

      expect(handle.signals).toBeDefined();
      expect(Object.keys(handle.signals)).toHaveLength(0);
    });

    it("should handle workflow with no updates", async () => {
      const mockHandle = {
        workflowId: "simple-123",
        result: vi.fn().mockResolvedValue("done"),
        query: vi.fn(),
        signal: vi.fn(),
        executeUpdate: vi.fn(),
        terminate: vi.fn(),
        cancel: vi.fn(),
      };

      mockWorkflow.start.mockResolvedValue(mockHandle);

      const handle = await typedClient.startWorkflow("simpleWorkflow", {
        workflowId: "simple-123",
        args: ["test"],
      });

      expect(handle.updates).toBeDefined();
      expect(Object.keys(handle.updates)).toHaveLength(0);
    });
  });
});
