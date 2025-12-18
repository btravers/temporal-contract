import { describe, expect, it } from "vitest";
import { Result } from "./result.js";

describe("Result", () => {
  describe("Ok", () => {
    it("should create Ok result", () => {
      // GIVEN
      const result = Result.Ok(42);

      // WHEN

      // THEN
      expect(result.isOk()).toBe(true);
      expect(result.isError()).toBe(false);
      if (result.isOk()) {
        expect(result.value).toBe(42);
      }
    });

    it("should map Ok values", () => {
      // GIVEN
      const result = Result.Ok(42);

      // WHEN
      const mapped = result.map((x) => x * 2);

      // THEN
      expect(mapped).toEqual(Result.Ok(84));
    });

    it("should flatMap Ok values", () => {
      // GIVEN
      const result = Result.Ok(42);

      // WHEN
      const flatMapped = result.flatMap((x) => Result.Ok(x * 2));

      // THEN
      expect(flatMapped).toEqual(Result.Ok(84));
    });

    it("should not mapError on Ok values", () => {
      // GIVEN
      const result = Result.Ok(42);

      // WHEN
      const mapped = result.mapError((e: string) => `Error: ${e}`);

      // THEN
      expect(mapped).toEqual(Result.Ok(42));
    });

    it("should match Ok values", () => {
      // GIVEN
      const result = Result.Ok(42);

      // WHEN
      const value = result.match({
        Ok: (value) => value * 2,
        Error: () => 0,
      });

      // THEN
      expect(value).toBe(84);
    });

    it("should getOr return the value", () => {
      // GIVEN
      const result = Result.Ok(42);

      // WHEN
      const value = result.getOr(0);

      // THEN
      expect(value).toBe(42);
    });

    it("should getWithDefault return the value", () => {
      // GIVEN
      const result = Result.Ok(42);

      // WHEN
      const value = result.getWithDefault(0);

      // THEN
      expect(value).toBe(42);
    });

    it("should convert to Some option", () => {
      // GIVEN
      const result = Result.Ok(42);

      // WHEN
      const option = result.toOption();

      // THEN
      expect(option).toEqual({ tag: "Some", value: 42 });
    });
  });

  describe("Error", () => {
    it("should create Error result", () => {
      // GIVEN
      const result = Result.Error("error message");

      // WHEN

      // THEN
      expect(result.isOk()).toBe(false);
      expect(result.isError()).toBe(true);
      if (result.isError()) {
        expect(result.error).toBe("error message");
      }
    });

    it("should not map Error values", () => {
      // GIVEN
      const result = Result.Error("error");

      // WHEN
      const mapped = result.map((x: number) => x * 2);

      // THEN
      expect(mapped).toEqual(Result.Error("error"));
    });

    it("should not flatMap Error values", () => {
      // GIVEN
      const result = Result.Error("error");

      // WHEN
      const flatMapped = result.flatMap((x: number) => Result.Ok(x * 2));

      // THEN
      expect(flatMapped).toEqual(Result.Error("error"));
    });

    it("should mapError on Error values", () => {
      // GIVEN
      const result = Result.Error("error");

      // WHEN
      const mapped = result.mapError((e) => `Wrapped: ${e}`);

      // THEN
      expect(mapped).toEqual(Result.Error("Wrapped: error"));
    });

    it("should match Error values", () => {
      // GIVEN
      const result = Result.Error("error");

      // WHEN
      const value = result.match({
        Ok: (value: number) => value * 2,
        Error: () => 0,
      });

      // THEN
      expect(value).toBe(0);
    });

    it("should getOr return default value", () => {
      // GIVEN
      const result: Result<number, string> = Result.Error("error");

      // WHEN
      const value = result.getOr(42);

      // THEN
      expect(value).toBe(42);
    });

    it("should getWithDefault return default value", () => {
      // GIVEN
      const result: Result<number, string> = Result.Error("error");

      // WHEN
      const value = result.getWithDefault(42);

      // THEN
      expect(value).toBe(42);
    });

    it("should convert to None option", () => {
      // GIVEN
      const result = Result.Error("error");

      // WHEN
      const option = result.toOption();

      // THEN
      expect(option.tag).toBe("None");
    });
  });

  describe("Result namespace", () => {
    it("should create Ok from Result.Ok", () => {
      // GIVEN
      const result = Result.Ok(42);

      // WHEN
      const isOk = result.isOk();

      // THEN
      expect(isOk).toBe(true);
    });

    it("should create Error from Result.Error", () => {
      // GIVEN
      const result = Result.Error("error");

      // WHEN
      const isError = result.isError();

      // THEN
      expect(isError).toBe(true);
    });

    it("should check isOk (Ok)", () => {
      // GIVEN
      const okResult = Result.Ok(42);

      // WHEN
      const value = Result.isOk(okResult);

      // THEN
      expect(value).toBe(true);
    });

    it("should check isOk (Error)", () => {
      // GIVEN
      const errorResult = Result.Error("error");

      // WHEN
      const value = Result.isOk(errorResult);

      // THEN
      expect(value).toBe(false);
    });

    it("should check isError (Ok)", () => {
      // GIVEN
      const okResult = Result.Ok(42);

      // WHEN
      const value = Result.isError(okResult);

      // THEN
      expect(value).toBe(false);
    });

    it("should check isError (Error)", () => {
      // GIVEN
      const errorResult = Result.Error("error");

      // WHEN
      const value = Result.isError(errorResult);

      // THEN
      expect(value).toBe(true);
    });

    it("should create Result from execution (Ok)", () => {
      // GIVEN

      // WHEN
      const successResult = Result.fromExecution(() => 42);

      // THEN
      expect(successResult).toEqual(Result.Ok(42));
    });

    it("should create Result from execution (Error)", () => {
      // GIVEN

      // WHEN
      const errorResult = Result.fromExecution(() => {
        throw new Error("test error");
      });

      // THEN
      expect(errorResult).toEqual(Result.Error(new Error("test error")));
    });

    it("should combine all Ok results", () => {
      // GIVEN
      const results = [Result.Ok(1), Result.Ok(2), Result.Ok(3)];

      // WHEN
      const combined = Result.all(results);

      // THEN
      expect(combined).toEqual(Result.Ok([1, 2, 3]));
    });

    it("should fail on first Error in all", () => {
      // GIVEN
      const results = [Result.Ok(1), Result.Error("error"), Result.Ok(3)];

      // WHEN
      const combined = Result.all(results);

      // THEN
      expect(combined).toEqual(Result.Error("error"));
    });
  });
});
