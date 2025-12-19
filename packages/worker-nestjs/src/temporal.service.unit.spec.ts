import { describe, expect, it, vi, beforeEach } from "vitest";
import { Test } from "@nestjs/testing";
import { Worker, NativeConnection } from "@temporalio/worker";
import { z } from "zod";
import type { ContractDefinition } from "@temporal-contract/contract";
import { TemporalService } from "./temporal.service.js";
import { MODULE_OPTIONS_TOKEN } from "./temporal.module-definition.js";
import type { TemporalModuleOptions } from "./interfaces.js";

// Mock @temporalio/worker
vi.mock("@temporalio/worker", () => ({
  Worker: {
    create: vi.fn(),
  },
  NativeConnection: {},
}));

describe("TemporalService", () => {
  let service: TemporalService;
  let mockWorker: Worker;
  let mockConnection: NativeConnection;
  let testContract: ContractDefinition;
  let testOptions: TemporalModuleOptions;

  beforeEach(async () => {
    vi.clearAllMocks();

    // Create test contract
    testContract = {
      taskQueue: "test-queue",
      workflows: {
        testWorkflow: {
          input: z.object({ value: z.string() }),
          output: z.object({ result: z.string() }),
        },
      },
    } satisfies ContractDefinition;

    // Mock connection
    mockConnection = { close: vi.fn() } as unknown as NativeConnection;

    // Mock worker
    mockWorker = {
      run: vi.fn().mockResolvedValue(undefined),
      shutdown: vi.fn().mockResolvedValue(undefined),
    } as unknown as Worker;

    vi.mocked(Worker.create).mockResolvedValue(mockWorker);

    // Create test options
    testOptions = {
      contract: testContract,
      connection: mockConnection,
      workflowsPath: "/path/to/workflows",
      activities: {},
    };

    // Create test module
    const moduleRef = await Test.createTestingModule({
      providers: [
        TemporalService,
        {
          provide: MODULE_OPTIONS_TOKEN,
          useValue: testOptions,
        },
      ],
    }).compile();

    service = moduleRef.get<TemporalService>(TemporalService);

    // Mock logger to suppress output during tests
    vi.spyOn(service["logger"], "log").mockImplementation(() => {});
    vi.spyOn(service["logger"], "error").mockImplementation(() => {});
  });

  describe("onModuleInit", () => {
    it("should initialize worker on module init", async () => {
      // WHEN
      await service.onModuleInit();

      // THEN
      expect(Worker.create).toHaveBeenCalledWith({
        ...testOptions,
        connection: mockConnection,
        workflowsPath: "/path/to/workflows",
        taskQueue: "test-queue",
        activities: {},
      });
      expect(service["logger"].log).toHaveBeenCalledWith("Initializing Temporal worker...");
      expect(service["logger"].log).toHaveBeenCalledWith("Temporal worker initialized");
    });

    it("should pass through additional worker options", async () => {
      // GIVEN
      const optionsWithNamespace = {
        ...testOptions,
        namespace: "custom-namespace",
      };

      const moduleRef = await Test.createTestingModule({
        providers: [
          TemporalService,
          {
            provide: MODULE_OPTIONS_TOKEN,
            useValue: optionsWithNamespace,
          },
        ],
      }).compile();

      const serviceWithNamespace = moduleRef.get<TemporalService>(TemporalService);
      vi.spyOn(serviceWithNamespace["logger"], "log").mockImplementation(() => {});

      // WHEN
      await serviceWithNamespace.onModuleInit();

      // THEN
      expect(Worker.create).toHaveBeenCalledWith(
        expect.objectContaining({
          namespace: "custom-namespace",
        }),
      );
    });

    it("should handle worker creation errors", async () => {
      // GIVEN
      const error = new Error("Worker creation failed");
      vi.mocked(Worker.create).mockRejectedValueOnce(error);

      // WHEN / THEN
      await expect(service.onModuleInit()).rejects.toThrow("Worker creation failed");
    });
  });

  describe("onModuleDestroy", () => {
    it("should stop worker on module destroy", async () => {
      // GIVEN
      await service.onModuleInit();

      // WHEN
      await service.onModuleDestroy();

      // THEN
      expect(mockWorker.shutdown).toHaveBeenCalled();
      expect(service.getWorker()).toBeUndefined();
    });

    it("should not throw if worker is not initialized", async () => {
      // WHEN / THEN
      await expect(service.onModuleDestroy()).resolves.not.toThrow();
    });
  });

  describe("start", () => {
    it("should start worker without blocking", async () => {
      // GIVEN
      await service.onModuleInit();

      // WHEN
      service.start();

      // THEN
      expect(mockWorker.run).toHaveBeenCalled();
      expect(service["logger"].log).toHaveBeenCalledWith(
        "Starting Temporal worker on task queue: test-queue",
      );
    });

    it("should throw error if worker not initialized", () => {
      // WHEN / THEN
      expect(() => service.start()).toThrow("Worker not initialized. Call initializeWorker first.");
    });

    it("should catch and log worker errors", async () => {
      // GIVEN
      await service.onModuleInit();
      const error = new Error("Worker runtime error");
      vi.mocked(mockWorker.run).mockRejectedValueOnce(error);

      // WHEN
      service.start();

      // Wait for promise to resolve
      await new Promise((resolve) => setTimeout(resolve, 10));

      // THEN
      expect(service["logger"].error).toHaveBeenCalledWith(
        "Temporal worker encountered an error: Worker runtime error",
        expect.any(String),
      );
    });
  });

  describe("stop", () => {
    it("should shutdown worker and clear instance", async () => {
      // GIVEN
      await service.onModuleInit();

      // WHEN
      await service.stop();

      // THEN
      expect(mockWorker.shutdown).toHaveBeenCalled();
      expect(service.getWorker()).toBeUndefined();
      expect(service["logger"].log).toHaveBeenCalledWith("Shutting down Temporal worker...");
      expect(service["logger"].log).toHaveBeenCalledWith("Temporal worker shut down");
    });

    it("should not throw if worker is already stopped", async () => {
      // GIVEN
      await service.onModuleInit();
      await service.stop();

      // WHEN / THEN
      await expect(service.stop()).resolves.not.toThrow();
    });

    it("should handle shutdown errors", async () => {
      // GIVEN
      await service.onModuleInit();
      const error = new Error("Shutdown failed");
      vi.mocked(mockWorker.shutdown).mockRejectedValueOnce(error);

      // WHEN / THEN
      await expect(service.stop()).rejects.toThrow("Shutdown failed");
    });
  });

  describe("getWorker", () => {
    it("should return undefined before initialization", () => {
      // WHEN
      const worker = service.getWorker();

      // THEN
      expect(worker).toBeUndefined();
    });

    it("should return worker after initialization", async () => {
      // GIVEN
      await service.onModuleInit();

      // WHEN
      const worker = service.getWorker();

      // THEN
      expect(worker).toBe(mockWorker);
    });

    it("should return undefined after stop", async () => {
      // GIVEN
      await service.onModuleInit();
      await service.stop();

      // WHEN
      const worker = service.getWorker();

      // THEN
      expect(worker).toBeUndefined();
    });
  });

  describe("activity handler registration", () => {
    it("should pass activities to worker", async () => {
      // GIVEN
      const activities = {
        testActivity: vi.fn(),
      };

      const optionsWithActivities = {
        ...testOptions,
        activities,
      };

      const moduleRef = await Test.createTestingModule({
        providers: [
          TemporalService,
          {
            provide: MODULE_OPTIONS_TOKEN,
            useValue: optionsWithActivities,
          },
        ],
      }).compile();

      const serviceWithActivities = moduleRef.get<TemporalService>(TemporalService);
      vi.spyOn(serviceWithActivities["logger"], "log").mockImplementation(() => {});

      // WHEN
      await serviceWithActivities.onModuleInit();

      // THEN
      expect(Worker.create).toHaveBeenCalledWith(
        expect.objectContaining({
          activities,
        }),
      );
    });
  });
});
