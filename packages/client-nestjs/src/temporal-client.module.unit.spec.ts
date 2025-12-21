import { describe, expect, it, vi, beforeEach } from "vitest";
import { Test } from "@nestjs/testing";
import { Injectable, Module } from "@nestjs/common";
import { Client } from "@temporalio/client";
import { z } from "zod";
import type { ContractDefinition } from "@temporal-contract/contract";
import { TemporalClientModule } from "./temporal-client.module.js";
import { TemporalClientService } from "./temporal-client.service.js";

// Mock @temporalio/client
vi.mock("@temporalio/client", () => ({
  Client: vi.fn(),
  Connection: {},
}));

describe("TemporalClientModule", () => {
  let testContract: ContractDefinition;
  let mockClient: Client;

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

    // Mock client
    mockClient = {
      connection: {},
      workflow: {
        start: vi.fn(),
        execute: vi.fn(),
        getHandle: vi.fn(),
      },
    } as unknown as Client;
  });

  describe("forRoot", () => {
    it("should create module with static configuration", async () => {
      // WHEN
      const module = await Test.createTestingModule({
        imports: [
          TemporalClientModule.forRoot({
            contract: testContract,
            client: mockClient,
          }),
        ],
      }).compile();

      // THEN
      const service = module.get<TemporalClientService>(TemporalClientService);
      expect(service).toBeDefined();
      expect(service.getClient()).toBeDefined();
    });

    it("should provide typed client through service", async () => {
      // WHEN
      const module = await Test.createTestingModule({
        imports: [
          TemporalClientModule.forRoot({
            contract: testContract,
            client: mockClient,
          }),
        ],
      }).compile();

      // THEN
      const service = module.get<TemporalClientService>(TemporalClientService);
      const client = service.getClient();

      expect(client).toBeDefined();
      expect(client.startWorkflow).toBeDefined();
      expect(client.executeWorkflow).toBeDefined();
      expect(client.getHandle).toBeDefined();
    });
  });

  describe("forRootAsync", () => {
    it("should create module with async configuration", async () => {
      // WHEN
      const module = await Test.createTestingModule({
        imports: [
          TemporalClientModule.forRootAsync({
            useFactory: async () => ({
              contract: testContract,
              client: mockClient,
            }),
          }),
        ],
      }).compile();

      // THEN
      const service = module.get<TemporalClientService>(TemporalClientService);
      expect(service).toBeDefined();
      expect(service.getClient()).toBeDefined();
    });

    it("should support dependency injection in factory", async () => {
      // GIVEN
      @Injectable()
      class ConfigService {
        getContract() {
          return testContract;
        }
        getClient() {
          return mockClient;
        }
      }

      @Module({
        providers: [ConfigService],
        exports: [ConfigService],
      })
      class ConfigModule {}

      // WHEN
      const module = await Test.createTestingModule({
        imports: [
          ConfigModule,
          TemporalClientModule.forRootAsync({
            imports: [ConfigModule],
            useFactory: async (config: ConfigService) => ({
              contract: config.getContract(),
              client: config.getClient(),
            }),
            inject: [ConfigService],
          }),
        ],
      }).compile();

      // THEN
      const service = module.get<TemporalClientService>(TemporalClientService);
      expect(service).toBeDefined();
      expect(service.getClient()).toBeDefined();
    });
  });

  describe("Global module", () => {
    it("should be available in child modules without re-import", async () => {
      // GIVEN
      @Module({
        providers: [],
      })
      class ChildModule {}

      @Module({
        imports: [
          TemporalClientModule.forRoot({
            contract: testContract,
            client: mockClient,
          }),
          ChildModule,
        ],
      })
      class RootModule {}

      // WHEN
      const module = await Test.createTestingModule({
        imports: [RootModule],
      }).compile();

      // THEN - Service should be accessible even though ChildModule doesn't import TemporalClientModule
      const service = module.get<TemporalClientService>(TemporalClientService);
      expect(service).toBeDefined();
    });
  });
});
