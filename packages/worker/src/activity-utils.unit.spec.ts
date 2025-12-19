import { describe, it, expect } from "vitest";
import { defineContract, defineActivity, defineWorkflow } from "@temporal-contract/contract";
import { z } from "zod";
import {
  getWorkflowActivities,
  getWorkflowActivityNames,
  isWorkflowActivity,
  getWorkflowNames,
} from "./activity-utils.js";

describe("Activity Utils", () => {
  const testContract = defineContract({
    taskQueue: "test-queue",
    activities: {
      globalActivity: defineActivity({
        input: z.object({ value: z.string() }),
        output: z.object({ result: z.string() }),
      }),
    },
    workflows: {
      testWorkflow: defineWorkflow({
        input: z.object({ id: z.string() }),
        output: z.object({ success: z.boolean() }),
        activities: {
          workflowActivity: defineActivity({
            input: z.object({ data: z.number() }),
            output: z.object({ processed: z.boolean() }),
          }),
          anotherActivity: defineActivity({
            input: z.object({ text: z.string() }),
            output: z.object({ length: z.number() }),
          }),
        },
      }),
      anotherWorkflow: defineWorkflow({
        input: z.object({ name: z.string() }),
        output: z.object({ done: z.boolean() }),
      }),
    },
  });

  describe("getWorkflowActivities", () => {
    it("should return both workflow-specific and global activities", () => {
      const activities = getWorkflowActivities(testContract, "testWorkflow");

      expect(activities).toHaveProperty("globalActivity");
      expect(activities).toHaveProperty("workflowActivity");
      expect(activities).toHaveProperty("anotherActivity");
    });

    it("should return only global activities when workflow has no specific activities", () => {
      const activities = getWorkflowActivities(testContract, "anotherWorkflow");

      expect(activities).toHaveProperty("globalActivity");
    });
  });

  describe("getWorkflowActivityNames", () => {
    it("should return array of activity names for a workflow", () => {
      const names = getWorkflowActivityNames(testContract, "testWorkflow");

      expect(names).toEqual(
        expect.arrayContaining(["globalActivity", "workflowActivity", "anotherActivity"]),
      );
      expect(names).toHaveLength(3);
    });

    it("should return only global activity names when workflow has no specific activities", () => {
      const names = getWorkflowActivityNames(testContract, "anotherWorkflow");

      expect(names).toEqual(["globalActivity"]);
    });
  });

  describe("isWorkflowActivity", () => {
    it("should return true for workflow-specific activities", () => {
      expect(isWorkflowActivity(testContract, "testWorkflow", "workflowActivity")).toBe(true);
      expect(isWorkflowActivity(testContract, "testWorkflow", "anotherActivity")).toBe(true);
    });

    it("should return true for global activities", () => {
      expect(isWorkflowActivity(testContract, "testWorkflow", "globalActivity")).toBe(true);
      expect(isWorkflowActivity(testContract, "anotherWorkflow", "globalActivity")).toBe(true);
    });

    it("should return false for non-existent activities", () => {
      expect(isWorkflowActivity(testContract, "testWorkflow", "nonExistentActivity")).toBe(false);
    });
  });

  describe("getWorkflowNames", () => {
    it("should return array of all workflow names", () => {
      const names = getWorkflowNames(testContract);

      expect(names).toEqual(expect.arrayContaining(["testWorkflow", "anotherWorkflow"]));
      expect(names).toHaveLength(2);
    });
  });
});
