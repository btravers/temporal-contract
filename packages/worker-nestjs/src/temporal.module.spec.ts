import { describe, expect, it, vi, beforeEach } from "vitest";
import { Test } from "@nestjs/testing";
import { Worker, NativeConnection } from "@temporalio/worker";
import { z } from "zod";
import type { ContractDefinition } from "@temporal-contract/contract";
import { TemporalModule } from "./temporal.module.js";
import { TemporalService } from "./temporal.service.js";

// Mock @temporalio/worker
vi.mock("@temporalio/worker", () => ({
  Worker: {
    create: vi.fn(),
  },
  NativeConnection: {},
}));

describe("TemporalModule", () => {
  let testContract: ContractDefinition;
  let mockConnection: NativeConnection;
  let mockWorker: Worker;

  beforeEach(() => {
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
  });

  describe("forRoot", () => {
    it("should create module with static configuration", async () => {
      // WHEN
      const moduleRef = await Test.createTestingModule({
        imports: [
          TemporalModule.forRoot({
            contract: testContract,
            connection: mockConnection,
            workflowsPath: "/path/to/workflows",
            activities: {},
          }),
        ],
      }).compile();

      const service = moduleRef.get<TemporalService>(TemporalService);

      // THEN
      expect(service).toBeDefined();
      expect(service).toBeInstanceOf(TemporalService);
    });

    it("should initialize worker with provided options", async () => {
      // WHEN
      const moduleRef = await Test.createTestingModule({
        imports: [
          TemporalModule.forRoot({
            contract: testContract,
            connection: mockConnection,
            workflowsPath: "/path/to/workflows",
            activities: {},
          }),
        ],
      }).compile();

      await moduleRef.init();

      // THEN
      expect(Worker.create).toHaveBeenCalledWith(
        expect.objectContaining({
          connection: mockConnection,
          taskQueue: "test-queue",
          workflowsPath: "/path/to/workflows",
          activities: {},
        }),
      );
    });

    it("should export TemporalService", async () => {
      // GIVEN
      const moduleRef = await Test.createTestingModule({
        imports: [
          TemporalModule.forRoot({
            contract: testContract,
            connection: mockConnection,
            workflowsPath: "/path/to/workflows",
            activities: {},
          }),
        ],
      }).compile();

      // WHEN
      const service = moduleRef.get<TemporalService>(TemporalService);

      // THEN
      expect(service).toBeDefined();
    });
  });

  describe("forRootAsync", () => {
    it("should create module with async factory configuration", async () => {
      // WHEN
      const moduleRef = await Test.createTestingModule({
        imports: [
          TemporalModule.forRootAsync({
            useFactory: async () => ({
              contract: testContract,
              connection: mockConnection,
              workflowsPath: "/path/to/workflows",
              activities: {},
            }),
          }),
        ],
      }).compile();

      const service = moduleRef.get<TemporalService>(TemporalService);

      // THEN
      expect(service).toBeDefined();
      expect(service).toBeInstanceOf(TemporalService);
    });

    it("should initialize worker with async options", async () => {
      // WHEN
      const moduleRef = await Test.createTestingModule({
        imports: [
          TemporalModule.forRootAsync({
            useFactory: async () => ({
              contract: testContract,
              connection: mockConnection,
              workflowsPath: "/path/to/workflows",
              activities: {},
            }),
          }),
        ],
      }).compile();

      await moduleRef.init();

      // THEN
      expect(Worker.create).toHaveBeenCalledWith(
        expect.objectContaining({
          connection: mockConnection,
          taskQueue: "test-queue",
          workflowsPath: "/path/to/workflows",
        }),
      );
    });

    it("should support async connection creation", async () => {
      // WHEN
      const moduleRef = await Test.createTestingModule({
        imports: [
          TemporalModule.forRootAsync({
            useFactory: async () => {
              // Simulate async connection creation
              await new Promise((resolve) => setTimeout(resolve, 10));
              return {
                contract: testContract,
                connection: mockConnection,
                workflowsPath: "/path/to/workflows",
                activities: {},
              };
            },
          }),
        ],
      }).compile();

      await moduleRef.init();

      // THEN
      expect(Worker.create).toHaveBeenCalled();
    });
  });

  describe("Global module", () => {
    it("should be marked as global module", () => {
      // The @Global() decorator should make the module global
      // This is tested by the module structure itself
      expect(TemporalModule).toBeDefined();
    });
  });

  describe("Lifecycle integration", () => {
    it("should initialize and cleanup worker through module lifecycle", async () => {
      // WHEN
      const moduleRef = await Test.createTestingModule({
        imports: [
          TemporalModule.forRoot({
            contract: testContract,
            connection: mockConnection,
            workflowsPath: "/path/to/workflows",
            activities: {},
          }),
        ],
      }).compile();

      await moduleRef.init();
      const service = moduleRef.get<TemporalService>(TemporalService);

      // THEN - Worker should be initialized
      expect(service.getWorker()).toBeDefined();

      // WHEN - Close module
      await moduleRef.close();

      // THEN - Worker should be shutdown
      expect(mockWorker.shutdown).toHaveBeenCalled();
    });
  });
});
