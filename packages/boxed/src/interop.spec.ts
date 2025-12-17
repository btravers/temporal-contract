import { describe, expect, it } from "vitest";
import { Result } from "./result.js";
import { Future } from "./future.js";
import {
  fromSwanResult,
  toSwanResult,
  fromSwanFuture,
  toSwanFuture,
  fromSwanFutureResult,
  toSwanFutureResult,
} from "./interop.js";
import { Result as SwanIoResult, Future as SwanIoFuture } from "@swan-io/boxed";

describe("Interoperability with @swan-io/boxed", () => {
  describe("Result interoperability", () => {
    it("should convert from swan Ok result to temporal Ok result", () => {
      // Create an actual swan-io Result
      const swanResult = SwanIoResult.Ok(42);

      const temporalResult = fromSwanResult(swanResult);
      expect(temporalResult.isOk()).toBe(true);
      if (temporalResult.isOk()) {
        expect(temporalResult.value).toBe(42);
      }
    });

    it("should convert from swan Error result to temporal Error result", () => {
      const swanResult = SwanIoResult.Error("error");

      const temporalResult = fromSwanResult(swanResult);
      expect(temporalResult.isError()).toBe(true);
      if (temporalResult.isError()) {
        expect(temporalResult.error).toBe("error");
      }
    });

    it("should convert from temporal Ok result to swan-compatible result", () => {
      const temporalResult = Result.Ok(42);
      const swanResult = toSwanResult(temporalResult);

      expect(swanResult.isOk()).toBe(true);
      const value = swanResult.match({
        Ok: (v) => v,
        Error: () => 0,
      });
      expect(value).toBe(42);
    });

    it("should convert from temporal Error result to swan-compatible result", () => {
      const temporalResult = Result.Error("error");
      const swanResult = toSwanResult(temporalResult);

      expect(swanResult.isError()).toBe(true);
      const error = swanResult.match({
        Ok: () => "",
        Error: (e) => e,
      });
      expect(error).toBe("error");
    });

    it("should maintain Result API compatibility", () => {
      const temporalResult = Result.Ok(42);
      const swanResult = toSwanResult(temporalResult);

      // Test map
      const mapped = swanResult.map((x) => x * 2);
      expect(mapped.match({ Ok: (v) => v, Error: () => 0 })).toBe(84);

      // Test getOr
      expect(swanResult.getOr(0)).toBe(42);
    });
  });

  describe("Future interoperability", () => {
    it("should convert from swan Future to temporal Future", async () => {
      // Create an actual swan-io Future
      const swanFuture = SwanIoFuture.value(42);

      const temporalFuture = await fromSwanFuture(swanFuture);
      const value = await temporalFuture;
      expect(value).toBe(42);
    });

    it("should convert from temporal Future to swan-compatible Future", async () => {
      const temporalFuture = Future.value(42);
      const swanFuture = toSwanFuture(temporalFuture);

      const value = await swanFuture;
      expect(value).toBe(42);
    });

    it("should maintain Future API compatibility", async () => {
      const temporalFuture = Future.value(42);
      const swanFuture = toSwanFuture(temporalFuture);

      // Test map (the correct way to transform Future values)
      const mapped = swanFuture.map((x) => x * 2);
      const value = await mapped;
      expect(value).toBe(84);

      // Test that the future can be awaited directly
      const temporalFuture2 = Future.value(42);
      const swanFuture2 = toSwanFuture(temporalFuture2);
      const directValue = await swanFuture2;
      expect(directValue).toBe(42);
    });
  });

  describe("Future<Result> interoperability", () => {
    it("should convert from swan Future<Result> to temporal Future<Result>", async () => {
      // Create an actual swan-io Future<Result>
      const swanResult = SwanIoResult.Ok(42);
      const swanFutureResult = SwanIoFuture.value(swanResult);

      const temporalFutureResult = await fromSwanFutureResult(swanFutureResult);
      const result = await temporalFutureResult;

      expect(result.isOk()).toBe(true);
      if (result.isOk()) {
        expect(result.value).toBe(42);
      }
    });

    it("should convert from temporal Future<Result> to swan-compatible Future<Result>", async () => {
      const temporalFutureResult = Future.value(Result.Ok(42));
      const swanFutureResult = toSwanFutureResult(temporalFutureResult);

      const result = await swanFutureResult;
      expect(result.isOk()).toBe(true);
      const value = result.match({
        Ok: (v) => v,
        Error: () => 0,
      });
      expect(value).toBe(42);
    });

    it("should maintain Future<Result> API compatibility", async () => {
      const temporalFutureResult = Future.value(Result.Ok(42));
      const swanFutureResult = toSwanFutureResult(temporalFutureResult);

      // Test mapOk with type transformation (number -> string)
      const mapped = swanFutureResult.mapOk((x) => `value: ${x}`);
      const result = await mapped;
      expect(result.match({ Ok: (v) => v, Error: () => "" })).toBe("value: 42");
    });
  });

  describe("Type compatibility", () => {
    it("should demonstrate that our types implement swan-io/boxed interface", () => {
      // This test verifies that our Result type is structurally compatible
      const temporalResult = Result.Ok(42);

      // These should compile without errors, proving structural compatibility
      const isOk: boolean = temporalResult.isOk();
      const isError: boolean = temporalResult.isError();
      const matched: number = temporalResult.match({
        Ok: (v) => v,
        Error: () => 0,
      });

      expect(isOk).toBe(true);
      expect(isError).toBe(false);
      expect(matched).toBe(42);
    });

    it("should demonstrate that our Future implements swan-io/boxed interface", async () => {
      // This test verifies that our Future type is structurally compatible
      const temporalFuture = Future.value(42);

      // These should compile without errors, proving structural compatibility
      const mapped = temporalFuture.map((x) => x * 2);
      const value = await mapped;

      expect(value).toBe(84);
    });
  });
});
