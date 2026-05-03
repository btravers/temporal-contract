/**
 * Coverage for the path-aware issue formatting in client validation errors.
 *
 * Mirrors the worker-side test (#141 closes both surfaces); the helpers are
 * intentionally duplicated across packages so each entry point has its own
 * formatting source of truth.
 */
import { describe, expect, it } from "vitest";
import type { StandardSchemaV1 } from "@standard-schema/spec";
import {
  QueryValidationError,
  SignalValidationError,
  UpdateValidationError,
  WorkflowValidationError,
} from "./errors.js";

const issue = (
  message: string,
  path?: ReadonlyArray<PropertyKey | StandardSchemaV1.PathSegment>,
): StandardSchemaV1.Issue => (path === undefined ? { message } : { message, path });

describe("validation error message formatting", () => {
  it("WorkflowValidationError includes the field path", () => {
    const error = new WorkflowValidationError("processOrder", "input", [
      issue("expected string", ["customerId"]),
    ]);
    expect(error.message).toBe(
      `Validation failed for workflow "processOrder" input: at customerId: expected string`,
    );
  });

  it("QueryValidationError includes nested path with array indices", () => {
    const error = new QueryValidationError("getOrderItems", "output", [
      issue("expected number", ["items", 3, "quantity"]),
    ]);
    expect(error.message).toBe(
      `Validation failed for query "getOrderItems" output: at items[3].quantity: expected number`,
    );
  });

  it("SignalValidationError joins multiple issues with their paths", () => {
    const error = new SignalValidationError("updateProgress", [
      issue("expected number", ["progress"]),
      issue("expected string", ["userId"]),
    ]);
    expect(error.message).toBe(
      `Validation failed for signal "updateProgress": at progress: expected number; at userId: expected string`,
    );
  });

  it("UpdateValidationError unwraps PathSegment-form entries", () => {
    const error = new UpdateValidationError("setConfig", "input", [
      issue("expected boolean", [{ key: "config" }, { key: "enabled" }]),
    ]);
    expect(error.message).toBe(
      `Validation failed for update "setConfig" input: at config.enabled: expected boolean`,
    );
  });

  it("falls back to just the message when no path is present", () => {
    const error = new WorkflowValidationError("processOrder", "input", [issue("invalid input")]);
    expect(error.message).toBe(
      `Validation failed for workflow "processOrder" input: invalid input`,
    );
  });

  it("preserves the typed `issues` property for programmatic access", () => {
    const issues = [issue("expected string", ["customerId"])];
    const error = new WorkflowValidationError("processOrder", "input", issues);
    expect(error.issues).toEqual(issues);
    expect(error.workflowName).toBe("processOrder");
    expect(error.direction).toBe("input");
  });
});
