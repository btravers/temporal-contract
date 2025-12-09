import { describe, expect, it } from "vitest";
import {
  defineActivity,
  defineQuery,
  defineSignal,
  defineUpdate,
  defineWorkflow,
} from "./builder.js";
import { z } from "zod";

describe("Helper Functions", () => {
  describe("defineActivity", () => {
    it("should create an activity definition", () => {
      const activity = defineActivity({
        input: z.object({ value: z.string() }),
        output: z.object({ result: z.string() }),
      });

      expect(activity.input).toBeDefined();
      expect(activity.output).toBeDefined();
    });
  });

  describe("defineSignal", () => {
    it("should create a signal definition", () => {
      const signal = defineSignal({
        input: z.object({ message: z.string() }),
      });

      expect(signal.input).toBeDefined();
    });

    it("should work with primitive types", () => {
      const signal = defineSignal({
        input: z.string(),
      });

      expect(signal.input).toBeDefined();
    });
  });

  describe("defineQuery", () => {
    it("should create a query definition", () => {
      const query = defineQuery({
        input: z.object({ id: z.string() }),
        output: z.object({ status: z.string() }),
      });

      expect(query.input).toBeDefined();
      expect(query.output).toBeDefined();
    });

    it("should work with void input", () => {
      const query = defineQuery({
        input: z.void(),
        output: z.object({ count: z.number() }),
      });

      expect(query.input).toBeDefined();
      expect(query.output).toBeDefined();
    });
  });

  describe("defineUpdate", () => {
    it("should create an update definition", () => {
      const update = defineUpdate({
        input: z.object({ value: z.number() }),
        output: z.object({ newValue: z.number() }),
      });

      expect(update.input).toBeDefined();
      expect(update.output).toBeDefined();
    });
  });

  describe("defineWorkflow", () => {
    it("should create a workflow definition", () => {
      const workflow = defineWorkflow({
        input: z.object({ orderId: z.string() }),
        output: z.object({ status: z.string() }),
      });

      expect(workflow.input).toBeDefined();
      expect(workflow.output).toBeDefined();
    });

    it("should support all interaction types", () => {
      const workflow = defineWorkflow({
        input: z.object({ orderId: z.string() }),
        output: z.object({ status: z.string() }),
        activities: {
          processPayment: {
            input: z.object({ amount: z.number() }),
            output: z.object({ success: z.boolean() }),
          },
        },
        signals: {
          cancelOrder: {
            input: z.object({ reason: z.string() }),
          },
        },
        queries: {
          getStatus: {
            input: z.void(),
            output: z.object({ status: z.string() }),
          },
        },
        updates: {
          updateAmount: {
            input: z.object({ newAmount: z.number() }),
            output: z.object({ updated: z.boolean() }),
          },
        },
      });

      expect(workflow.activities).toBeDefined();
      expect(workflow.signals).toBeDefined();
      expect(workflow.queries).toBeDefined();
      expect(workflow.updates).toBeDefined();
    });
  });
});
