import { describe, it, expect } from "vitest";
import { defineContract } from "./builder.js";
import {
  getAllActivityNames,
  getWorkflowActivities,
  hasWorkflow,
  hasGlobalActivity,
  getWorkflowNames,
  getContractStats,
  mergeContracts,
  isContract,
} from "./helpers.js";
import { z } from "zod";

describe("Contract Helpers", () => {
  const sampleContract = defineContract({
    taskQueue: "test-queue",
    workflows: {
      workflow1: {
        input: z.object({ id: z.string() }),
        output: z.object({ success: z.boolean() }),
        activities: {
          activity1: {
            input: z.object({ data: z.string() }),
            output: z.object({ result: z.string() }),
          },
        },
        signals: {
          signal1: {
            input: z.object({ message: z.string() }),
          },
        },
        queries: {
          query1: {
            input: z.object({ key: z.string() }),
            output: z.object({ value: z.string() }),
          },
        },
      },
      workflow2: {
        input: z.object({ name: z.string() }),
        output: z.object({ done: z.boolean() }),
        activities: {
          activity2: {
            input: z.object({ input: z.number() }),
            output: z.object({ output: z.number() }),
          },
        },
      },
    },
    activities: {
      globalActivity: {
        input: z.object({ msg: z.string() }),
        output: z.void(),
      },
    },
  });

  describe("getAllActivityNames", () => {
    it("should return all unique activity names", () => {
      const names = getAllActivityNames(sampleContract);
      expect(names).toEqual(["activity1", "activity2", "globalActivity"]);
    });

    it("should return only global activities if no workflow activities exist", () => {
      const contract = defineContract({
        taskQueue: "test",
        workflows: {
          wf: {
            input: z.object({}),
            output: z.object({}),
          },
        },
        activities: {
          global1: { input: z.void(), output: z.void() },
        },
      });
      const names = getAllActivityNames(contract);
      expect(names).toEqual(["global1"]);
    });

    it("should return empty array if no activities exist", () => {
      const contract = defineContract({
        taskQueue: "test",
        workflows: {
          wf: {
            input: z.object({}),
            output: z.object({}),
          },
        },
      });
      const names = getAllActivityNames(contract);
      expect(names).toEqual([]);
    });
  });

  describe("getWorkflowActivities", () => {
    it("should return workflow-specific and global activities", () => {
      const activities = getWorkflowActivities(sampleContract, "workflow1");
      expect(Object.keys(activities)).toContain("activity1");
      expect(Object.keys(activities)).toContain("globalActivity");
    });

    it("should throw error for non-existent workflow", () => {
      expect(() => getWorkflowActivities(sampleContract, "nonexistent")).toThrow(
        'Workflow "nonexistent" not found',
      );
    });

    it("should return only global activities if workflow has no specific activities", () => {
      const contract = defineContract({
        taskQueue: "test",
        workflows: {
          wf: {
            input: z.object({}),
            output: z.object({}),
          },
        },
        activities: {
          global1: { input: z.void(), output: z.void() },
        },
      });
      const activities = getWorkflowActivities(contract, "wf");
      expect(Object.keys(activities)).toEqual(["global1"]);
    });
  });

  describe("hasWorkflow", () => {
    it("should return true for existing workflow", () => {
      expect(hasWorkflow(sampleContract, "workflow1")).toBe(true);
      expect(hasWorkflow(sampleContract, "workflow2")).toBe(true);
    });

    it("should return false for non-existent workflow", () => {
      expect(hasWorkflow(sampleContract, "nonexistent")).toBe(false);
    });
  });

  describe("hasGlobalActivity", () => {
    it("should return true for existing global activity", () => {
      expect(hasGlobalActivity(sampleContract, "globalActivity")).toBe(true);
    });

    it("should return false for non-existent global activity", () => {
      expect(hasGlobalActivity(sampleContract, "activity1")).toBe(false);
      expect(hasGlobalActivity(sampleContract, "nonexistent")).toBe(false);
    });

    it("should return false if contract has no global activities", () => {
      const contract = defineContract({
        taskQueue: "test",
        workflows: {
          wf: {
            input: z.object({}),
            output: z.object({}),
          },
        },
      });
      expect(hasGlobalActivity(contract, "any")).toBe(false);
    });
  });

  describe("getWorkflowNames", () => {
    it("should return sorted workflow names", () => {
      const names = getWorkflowNames(sampleContract);
      expect(names).toEqual(["workflow1", "workflow2"]);
    });
  });

  describe("getContractStats", () => {
    it("should return correct statistics", () => {
      const stats = getContractStats(sampleContract);
      expect(stats).toEqual({
        workflowCount: 2,
        globalActivityCount: 1,
        totalActivityCount: 3,
        signalCount: 1,
        queryCount: 1,
        updateCount: 0,
      });
    });

    it("should handle contract with no global activities", () => {
      const contract = defineContract({
        taskQueue: "test",
        workflows: {
          wf: {
            input: z.object({}),
            output: z.object({}),
          },
        },
      });
      const stats = getContractStats(contract);
      expect(stats.globalActivityCount).toBe(0);
      expect(stats.totalActivityCount).toBe(0);
    });
  });

  describe("mergeContracts", () => {
    it("should merge multiple contracts", () => {
      const contract1 = defineContract({
        taskQueue: "queue1",
        workflows: {
          wf1: {
            input: z.object({}),
            output: z.object({}),
          },
        },
      });

      const contract2 = defineContract({
        taskQueue: "queue2",
        workflows: {
          wf2: {
            input: z.object({}),
            output: z.object({}),
          },
        },
        activities: {
          act1: { input: z.void(), output: z.void() },
        },
      });

      const merged = mergeContracts("merged-queue", [contract1, contract2]);

      expect(merged.taskQueue).toBe("merged-queue");
      expect(Object.keys(merged.workflows)).toEqual(["wf1", "wf2"]);
      expect(Object.keys(merged.activities ?? {})).toEqual(["act1"]);
    });

    it("should override workflows with same name", () => {
      const contract1 = defineContract({
        taskQueue: "queue1",
        workflows: {
          wf: {
            input: z.object({ v1: z.string() }),
            output: z.object({}),
          },
        },
      });

      const contract2 = defineContract({
        taskQueue: "queue2",
        workflows: {
          wf: {
            input: z.object({ v2: z.number() }),
            output: z.object({}),
          },
        },
      });

      const merged = mergeContracts("merged", [contract1, contract2]);

      // The second contract's workflow should override the first
      expect(merged.workflows.wf.input).toBe(contract2.workflows.wf.input);
    });

    it("should throw error for empty contracts array", () => {
      expect(() => mergeContracts("test", [])).toThrow("Cannot merge empty contracts array");
    });
  });

  describe("isContract", () => {
    it("should return true for valid contract", () => {
      expect(isContract(sampleContract)).toBe(true);
    });

    it("should return false for invalid values", () => {
      expect(isContract(null)).toBe(false);
      expect(isContract(undefined)).toBe(false);
      expect(isContract({})).toBe(false);
      expect(isContract({ taskQueue: "test" })).toBe(false);
      expect(isContract({ workflows: {} })).toBe(false);
      expect(isContract({ taskQueue: "test", workflows: {} })).toBe(false);
      expect(isContract("string")).toBe(false);
      expect(isContract(123)).toBe(false);
    });

    it("should return true for object with required structure", () => {
      const minimal = {
        taskQueue: "test",
        workflows: {
          wf: {
            input: z.object({}),
            output: z.object({}),
          },
        },
      };
      expect(isContract(minimal)).toBe(true);
    });
  });
});
