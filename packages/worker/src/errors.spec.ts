/**
 * Coverage for the path-aware issue formatting in worker validation errors.
 *
 * The error classes are simple constructors; what we care about is that the
 * resulting `error.message` includes the failing field's path so debugging
 * a contract validation failure isn't a guessing game.
 *
 * Closes #141.
 */
import { describe, expect, it } from "vitest";
import type { StandardSchemaV1 } from "@standard-schema/spec";
import {
  ActivityInputValidationError,
  ActivityOutputValidationError,
  WorkflowInputValidationError,
} from "./errors.js";

const issue = (
  message: string,
  path?: ReadonlyArray<PropertyKey | StandardSchemaV1.PathSegment>,
): StandardSchemaV1.Issue => (path === undefined ? { message } : { message, path });

describe("validation error message formatting", () => {
  it("falls back to just the message when no path is present", () => {
    const error = new ActivityInputValidationError("act", [issue("invalid input")]);
    expect(error.message).toBe(`Activity "act" input validation failed: invalid input`);
  });

  it("renders a top-level string key with no prefix", () => {
    const error = new ActivityInputValidationError("act", [
      issue("expected string", ["customerId"]),
    ]);
    expect(error.message).toBe(
      `Activity "act" input validation failed: at customerId: expected string`,
    );
  });

  it("renders nested object paths with dot notation", () => {
    const error = new ActivityInputValidationError("act", [
      issue("expected number", ["payment", "amount"]),
    ]);
    expect(error.message).toBe(
      `Activity "act" input validation failed: at payment.amount: expected number`,
    );
  });

  it("renders array indices with bracket notation", () => {
    const error = new ActivityInputValidationError("act", [issue("expected object", ["items", 0])]);
    expect(error.message).toBe(
      `Activity "act" input validation failed: at items[0]: expected object`,
    );
  });

  it("renders mixed object/array paths", () => {
    const error = new ActivityInputValidationError("act", [
      issue("expected number", ["items", 2, "quantity"]),
    ]);
    expect(error.message).toBe(
      `Activity "act" input validation failed: at items[2].quantity: expected number`,
    );
  });

  it("unwraps PathSegment-form path entries (Standard Schema spec)", () => {
    // Per the spec, paths can be `ReadonlyArray<PropertyKey | PathSegment>`.
    // PathSegment objects expose the underlying key via `.key`.
    const error = new ActivityInputValidationError("act", [
      issue("expected boolean", [{ key: "items" }, { key: 0 }, { key: "active" }]),
    ]);
    expect(error.message).toBe(
      `Activity "act" input validation failed: at items[0].active: expected boolean`,
    );
  });

  it("falls back to bracket-stringification for symbol path segments", () => {
    const symbolKey = Symbol("hidden");
    const error = new ActivityInputValidationError("act", [issue("invalid", [symbolKey])]);
    expect(error.message).toBe(
      `Activity "act" input validation failed: at [Symbol(hidden)]: invalid`,
    );
  });

  it("joins multiple issues with `; ` and applies path formatting to each", () => {
    const error = new ActivityInputValidationError("act", [
      issue("expected array, received undefined", ["items"]),
      issue("expected number, received undefined", ["items", 0, "quantity"]),
    ]);
    // Reproduces the issue's example output, with paths now visible.
    expect(error.message).toBe(
      `Activity "act" input validation failed: ` +
        `at items: expected array, received undefined; ` +
        `at items[0].quantity: expected number, received undefined`,
    );
  });

  it("applies path formatting on the output side too", () => {
    const error = new ActivityOutputValidationError("act", [
      issue("expected string", ["transactionId"]),
    ]);
    expect(error.message).toContain(`at transactionId: expected string`);
  });

  it("applies to workflow validation errors as well", () => {
    const error = new WorkflowInputValidationError("processOrder", [
      issue("expected number", ["totalAmount"]),
    ]);
    expect(error.message).toBe(
      `Workflow "processOrder" input validation failed: at totalAmount: expected number`,
    );
  });

  it("preserves the typed `issues` property for programmatic access", () => {
    const issues = [issue("expected string", ["customerId"])];
    const error = new ActivityInputValidationError("act", issues);
    expect(error.issues).toEqual(issues);
    expect(error.activityName).toBe("act");
  });
});
