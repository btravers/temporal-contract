import { describe, it, expect } from "vitest";
import { defineContract } from "./builder.js";
import {
  debugContract,
  debugContractJSON,
  validateContractNaming,
  compareContracts,
} from "./debug.js";
import { z } from "zod";

describe("Debug Utilities", () => {
  const sampleContract = defineContract({
    taskQueue: "test-queue",
    workflows: {
      processOrder: {
        input: z.object({ id: z.string() }),
        output: z.object({ success: z.boolean() }),
        activities: {
          chargePayment: {
            input: z.object({ amount: z.number() }),
            output: z.object({ transactionId: z.string() }),
          },
          sendEmail: {
            input: z.object({ to: z.string() }),
            output: z.void(),
          },
        },
        signals: {
          cancelOrder: {
            input: z.object({ reason: z.string() }),
          },
        },
        queries: {
          getStatus: {
            input: z.object({}),
            output: z.object({ status: z.string() }),
          },
        },
      },
      sendNotification: {
        input: z.object({ message: z.string() }),
        output: z.object({ sent: z.boolean() }),
      },
    },
    activities: {
      logEvent: {
        input: z.object({ msg: z.string() }),
        output: z.void(),
      },
    },
  });

  describe("debugContract", () => {
    it("should generate a readable summary", () => {
      const summary = debugContract(sampleContract);
      expect(summary).toMatchInlineSnapshot(`
        "Contract: test-queue
          Workflows: 2
            - processOrder (activities: 2, signals: 1, queries: 1)
            - sendNotification
          Global Activities: 1"
      `);
    });

    it("should handle contract with minimal workflows", () => {
      const minimalContract = defineContract({
        taskQueue: "minimal",
        workflows: {
          simple: {
            input: z.object({}),
            output: z.object({}),
          },
        },
      });

      const summary = debugContract(minimalContract);
      expect(summary).toMatchInlineSnapshot(`
        "Contract: minimal
          Workflows: 1
            - simple"
      `);
    });
  });

  describe("debugContractJSON", () => {
    it("should generate JSON representation", () => {
      const json = debugContractJSON(sampleContract);

      expect(json["taskQueue"]).toBe("test-queue");
      expect(Object.keys(json["workflows"] as Record<string, unknown>)).toHaveLength(2);

      const processOrder = (json["workflows"] as Record<string, unknown>)["processOrder"] as Record<
        string,
        unknown
      >;
      expect(processOrder["hasInput"]).toBe(true);
      expect(processOrder["hasOutput"]).toBe(true);
      expect((processOrder["activities"] as string[]).length).toBe(2);
      expect((processOrder["signals"] as string[]).length).toBe(1);
      expect((processOrder["queries"] as string[]).length).toBe(1);
    });

    it("should handle workflows without operations", () => {
      const contract = defineContract({
        taskQueue: "test",
        workflows: {
          simple: {
            input: z.object({}),
            output: z.object({}),
          },
        },
      });

      const json = debugContractJSON(contract);
      const simple = (json["workflows"] as Record<string, unknown>)["simple"] as Record<
        string,
        unknown
      >;

      expect((simple["activities"] as string[]).length).toBe(0);
      expect((simple["signals"] as string[]).length).toBe(0);
      expect((simple["queries"] as string[]).length).toBe(0);
      expect((simple["updates"] as string[]).length).toBe(0);
    });
  });

  describe("validateContractNaming", () => {
    it("should return no issues for valid camelCase names", () => {
      const issues = validateContractNaming(sampleContract);
      expect(issues).toHaveLength(0);
    });

    it("should detect non-camelCase workflow names", () => {
      const contract = defineContract({
        taskQueue: "test",
        workflows: {
          ProcessOrder: {
            // PascalCase
            input: z.object({}),
            output: z.object({}),
          },
        },
      });

      const issues = validateContractNaming(contract);
      expect(issues).toHaveLength(1);
      expect(issues[0]).toContain("ProcessOrder");
      expect(issues[0]).toContain("camelCase");
    });

    it("should detect non-camelCase activity names", () => {
      const contract = defineContract({
        taskQueue: "test",
        workflows: {
          workflow: {
            input: z.object({}),
            output: z.object({}),
            activities: {
              SendEmail: {
                // PascalCase
                input: z.void(),
                output: z.void(),
              },
            },
          },
        },
      });

      const issues = validateContractNaming(contract);
      expect(issues).toHaveLength(1);
      expect(issues[0]).toContain("SendEmail");
    });

    it("should detect multiple naming issues", () => {
      const contract = defineContract({
        taskQueue: "test",
        workflows: {
          ProcessOrder: {
            input: z.object({}),
            output: z.object({}),
            signals: {
              Cancel_Order: {
                input: z.object({}),
              },
            },
          },
        },
        activities: {
          log_event: {
            input: z.void(),
            output: z.void(),
          },
        },
      });

      const issues = validateContractNaming(contract);
      expect(issues.length).toBeGreaterThan(0);
    });
  });

  describe("compareContracts", () => {
    it("should detect added workflows", () => {
      const oldContract = defineContract({
        taskQueue: "test",
        workflows: {
          workflow1: {
            input: z.object({}),
            output: z.object({}),
          },
        },
      });

      const newContract = defineContract({
        taskQueue: "test",
        workflows: {
          workflow1: {
            input: z.object({}),
            output: z.object({}),
          },
          workflow2: {
            input: z.object({}),
            output: z.object({}),
          },
        },
      });

      const diff = compareContracts(oldContract, newContract);
      expect(diff.addedWorkflows).toEqual(["workflow2"]);
      expect(diff.removedWorkflows).toHaveLength(0);
      expect(diff.taskQueueChanged).toBe(false);
    });

    it("should detect removed workflows", () => {
      const oldContract = defineContract({
        taskQueue: "test",
        workflows: {
          workflow1: {
            input: z.object({}),
            output: z.object({}),
          },
          workflow2: {
            input: z.object({}),
            output: z.object({}),
          },
        },
      });

      const newContract = defineContract({
        taskQueue: "test",
        workflows: {
          workflow1: {
            input: z.object({}),
            output: z.object({}),
          },
        },
      });

      const diff = compareContracts(oldContract, newContract);
      expect(diff.addedWorkflows).toHaveLength(0);
      expect(diff.removedWorkflows).toEqual(["workflow2"]);
    });

    it("should detect modified workflows", () => {
      const oldContract = defineContract({
        taskQueue: "test",
        workflows: {
          workflow1: {
            input: z.object({}),
            output: z.object({}),
            activities: {
              activity1: {
                input: z.void(),
                output: z.void(),
              },
            },
          },
        },
      });

      const newContract = defineContract({
        taskQueue: "test",
        workflows: {
          workflow1: {
            input: z.object({}),
            output: z.object({}),
            activities: {
              activity1: {
                input: z.void(),
                output: z.void(),
              },
              activity2: {
                input: z.void(),
                output: z.void(),
              },
            },
          },
        },
      });

      const diff = compareContracts(oldContract, newContract);
      expect(diff.modifiedWorkflows).toEqual(["workflow1"]);
    });

    it("should detect task queue changes", () => {
      const oldContract = defineContract({
        taskQueue: "old-queue",
        workflows: {
          wf: {
            input: z.object({}),
            output: z.object({}),
          },
        },
      });

      const newContract = defineContract({
        taskQueue: "new-queue",
        workflows: {
          wf: {
            input: z.object({}),
            output: z.object({}),
          },
        },
      });

      const diff = compareContracts(oldContract, newContract);
      expect(diff.taskQueueChanged).toBe(true);
    });

    it("should detect added and removed global activities", () => {
      const oldContract = defineContract({
        taskQueue: "test",
        workflows: {
          wf: {
            input: z.object({}),
            output: z.object({}),
          },
        },
        activities: {
          activity1: {
            input: z.void(),
            output: z.void(),
          },
        },
      });

      const newContract = defineContract({
        taskQueue: "test",
        workflows: {
          wf: {
            input: z.object({}),
            output: z.object({}),
          },
        },
        activities: {
          activity2: {
            input: z.void(),
            output: z.void(),
          },
        },
      });

      const diff = compareContracts(oldContract, newContract);
      expect(diff.addedGlobalActivities).toEqual(["activity2"]);
      expect(diff.removedGlobalActivities).toEqual(["activity1"]);
    });
  });
});
