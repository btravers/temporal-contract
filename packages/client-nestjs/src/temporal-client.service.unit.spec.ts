import { describe, expect, it, vi, beforeEach } from "vitest";
import { Test } from "@nestjs/testing";
import { Client } from "@temporalio/client";
import { z } from "zod";
import type { ContractDefinition } from "@temporal-contract/contract";
import { TemporalClientService } from "./temporal-client.service.js";
import { MODULE_OPTIONS_TOKEN } from "./temporal-client.module-definition.js";
import type { TemporalClientModuleOptions } from "./interfaces.js";

describe("TemporalClientService", () => {
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

  describe("initialization", () => {
    it("should create typed client on initialization", async () => {
      // GIVEN
      const options: TemporalClientModuleOptions = {
        contract: testContract,
        client: mockClient,
      };

      // WHEN
      const module = await Test.createTestingModule({
        providers: [
          TemporalClientService,
          {
            provide: MODULE_OPTIONS_TOKEN,
            useValue: options,
          },
        ],
      }).compile();

      // THEN
      const service = module.get<TemporalClientService>(TemporalClientService);
      expect(service).toBeDefined();
      expect(service.getClient()).toBeDefined();
    });

    it("should return typed client with correct methods", async () => {
      // GIVEN
      const options: TemporalClientModuleOptions = {
        contract: testContract,
        client: mockClient,
      };

      const module = await Test.createTestingModule({
        providers: [
          TemporalClientService,
          {
            provide: MODULE_OPTIONS_TOKEN,
            useValue: options,
          },
        ],
      }).compile();

      // WHEN
      const service = module.get<TemporalClientService>(TemporalClientService);
      const client = service.getClient();

      // THEN
      expect(client.startWorkflow).toBeDefined();
      expect(client.executeWorkflow).toBeDefined();
      expect(client.getHandle).toBeDefined();
    });
  });

  describe("lifecycle", () => {
    it("should handle module destruction gracefully", async () => {
      // GIVEN
      const options: TemporalClientModuleOptions = {
        contract: testContract,
        client: mockClient,
      };

      const module = await Test.createTestingModule({
        providers: [
          TemporalClientService,
          {
            provide: MODULE_OPTIONS_TOKEN,
            useValue: options,
          },
        ],
      }).compile();

      const service = module.get<TemporalClientService>(TemporalClientService);

      // WHEN
      await module.close();

      // THEN - Should not throw
      expect(service).toBeDefined();
    });
  });

  describe("getClient", () => {
    it("should always return the same client instance", async () => {
      // GIVEN
      const options: TemporalClientModuleOptions = {
        contract: testContract,
        client: mockClient,
      };

      const module = await Test.createTestingModule({
        providers: [
          TemporalClientService,
          {
            provide: MODULE_OPTIONS_TOKEN,
            useValue: options,
          },
        ],
      }).compile();

      const service = module.get<TemporalClientService>(TemporalClientService);

      // WHEN
      const client1 = service.getClient();
      const client2 = service.getClient();

      // THEN
      expect(client1).toBe(client2);
    });
  });
});
