import { describe, expect, it, vi, beforeEach } from "vitest";
import { z } from "zod";
import type { ContractDefinition } from "@temporal-contract/contract";
import { createWorker, workflowsPathFromURL } from "./worker.js";
import { NativeConnection, Worker } from "@temporalio/worker";

// Mock @temporalio/worker
vi.mock("@temporalio/worker", () => ({
  NativeConnection: {
    connect: vi.fn(),
  },
  Worker: {
    create: vi.fn(),
  },
}));

describe("Worker Entry Point", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("createWorker", () => {
    it("should create a worker with contract task queue", async () => {
      // GIVEN
      const contract = {
        taskQueue: "test-queue",
        workflows: {
          testWorkflow: {
            input: z.object({ value: z.string() }),
            output: z.object({ result: z.string() }),
          },
        },
      } satisfies ContractDefinition;

      const mockConnection = { close: vi.fn() } as unknown as NativeConnection;
      const mockWorker = { run: vi.fn() } as unknown as Worker;

      vi.mocked(NativeConnection.connect).mockResolvedValue(mockConnection);
      vi.mocked(Worker.create).mockResolvedValue(mockWorker);

      // WHEN
      const worker = await createWorker({
        contract,
        workflowsPath: "/path/to/workflows",
        activities: {},
      });

      // THEN
      expect(NativeConnection.connect).toHaveBeenCalledWith({
        address: "localhost:7233",
      });
      expect(Worker.create).toHaveBeenCalledWith({
        connection: mockConnection,
        taskQueue: "test-queue",
        workflowsPath: "/path/to/workflows",
        activities: {},
      });
      expect(worker).toBe(mockWorker);
    });

    it("should use provided connection if available", async () => {
      // GIVEN
      const contract = {
        taskQueue: "my-queue",
        workflows: {
          testWorkflow: {
            input: z.object({ value: z.string() }),
            output: z.object({ result: z.string() }),
          },
        },
      } satisfies ContractDefinition;

      const existingConnection = { close: vi.fn() } as unknown as NativeConnection;
      const mockWorker = { run: vi.fn() } as unknown as Worker;

      vi.mocked(Worker.create).mockResolvedValue(mockWorker);

      // WHEN
      const worker = await createWorker({
        contract,
        connection: existingConnection,
        workflowsPath: "/path/to/workflows",
        activities: {},
      });

      // THEN
      expect(NativeConnection.connect).not.toHaveBeenCalled();
      expect(Worker.create).toHaveBeenCalledWith({
        connection: existingConnection,
        taskQueue: "my-queue",
        workflowsPath: "/path/to/workflows",
        activities: {},
      });
      expect(worker).toBe(mockWorker);
    });

    it("should use custom connection options if provided", async () => {
      // GIVEN
      const contract = {
        taskQueue: "test-queue",
        workflows: {
          testWorkflow: {
            input: z.object({ value: z.string() }),
            output: z.object({ result: z.string() }),
          },
        },
      } satisfies ContractDefinition;

      const mockConnection = { close: vi.fn() } as unknown as NativeConnection;
      const mockWorker = { run: vi.fn() } as unknown as Worker;

      vi.mocked(NativeConnection.connect).mockResolvedValue(mockConnection);
      vi.mocked(Worker.create).mockResolvedValue(mockWorker);

      // WHEN
      await createWorker({
        contract,
        workflowsPath: "/path/to/workflows",
        activities: {},
        connectionOptions: {
          address: "custom-host:7234",
        },
      });

      // THEN
      expect(NativeConnection.connect).toHaveBeenCalledWith({
        address: "custom-host:7234",
      });
    });
  });

  describe("workflowsPathFromURL", () => {
    it("should generate correct workflow path from URL", () => {
      // GIVEN
      const baseURL = "file:///home/user/project/worker.js";
      const relativePath = "./workflows";

      // WHEN
      const result = workflowsPathFromURL(baseURL, relativePath);

      // THEN
      expect(result).toContain("workflows");
      expect(result).toContain(".js");
    });

    it("should preserve file extension from base URL", () => {
      // GIVEN
      const baseURL = "file:///home/user/project/worker.ts";
      const relativePath = "./workflows";

      // WHEN
      const result = workflowsPathFromURL(baseURL, relativePath);

      // THEN
      expect(result).toContain("workflows");
      expect(result).toContain(".ts");
    });
  });
});
