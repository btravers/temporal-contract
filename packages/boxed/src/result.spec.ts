import { describe, expect, it } from "vitest";
import { Result } from "./result.js";

describe("Result", () => {
  describe("Ok", () => {
    it("should create Ok result", () => {
      const result = Result.Ok(42);
      expect(result.isOk()).toBe(true);
      expect(result.isError()).toBe(false);
      if (result.isOk()) {
        expect(result.value).toBe(42);
      }
    });

    it("should map Ok values", () => {
      const result = Result.Ok(42);
      const mapped = result.map((x) => x * 2);
      expect(mapped.isOk()).toBe(true);
      if (mapped.isOk()) {
        expect(mapped.value).toBe(84);
      }
    });

    it("should flatMap Ok values", () => {
      const result = Result.Ok(42);
      const flatMapped = result.flatMap((x) => Result.Ok(x * 2));
      expect(flatMapped.isOk()).toBe(true);
      if (flatMapped.isOk()) {
        expect(flatMapped.value).toBe(84);
      }
    });

    it("should not mapError on Ok values", () => {
      const result = Result.Ok(42);
      const mapped = result.mapError((e: string) => `Error: ${e}`);
      expect(mapped.isOk()).toBe(true);
      if (mapped.isOk()) {
        expect(mapped.value).toBe(42);
      }
    });

    it("should match Ok values", () => {
      const result = Result.Ok(42);
      const value = result.match({
        Ok: (value) => value * 2,
        Error: () => 0,
      });
      expect(value).toBe(84);
    });

    it("should getOr return the value", () => {
      const result = Result.Ok(42);
      expect(result.getOr(0)).toBe(42);
    });

    it("should getWithDefault return the value", () => {
      const result = Result.Ok(42);
      expect(result.getWithDefault(0)).toBe(42);
    });

    it("should convert to Some option", () => {
      const result = Result.Ok(42);
      const option = result.toOption();
      expect(option.tag).toBe("Some");
      if (option.tag === "Some") {
        expect(option.value).toBe(42);
      }
    });
  });

  describe("Error", () => {
    it("should create Error result", () => {
      const result = Result.Error("error message");
      expect(result.isOk()).toBe(false);
      expect(result.isError()).toBe(true);
      if (result.isError()) {
        expect(result.error).toBe("error message");
      }
    });

    it("should not map Error values", () => {
      const result = Result.Error("error");
      const mapped = result.map((x: number) => x * 2);
      expect(mapped.isError()).toBe(true);
      if (mapped.isError()) {
        expect(mapped.error).toBe("error");
      }
    });

    it("should not flatMap Error values", () => {
      const result = Result.Error("error");
      const flatMapped = result.flatMap((x: number) => Result.Ok(x * 2));
      expect(flatMapped.isError()).toBe(true);
      if (flatMapped.isError()) {
        expect(flatMapped.error).toBe("error");
      }
    });

    it("should mapError on Error values", () => {
      const result = Result.Error("error");
      const mapped = result.mapError((e) => `Wrapped: ${e}`);
      expect(mapped.isError()).toBe(true);
      if (mapped.isError()) {
        expect(mapped.error).toBe("Wrapped: error");
      }
    });

    it("should match Error values", () => {
      const result = Result.Error("error");
      const value = result.match({
        Ok: (value: number) => value * 2,
        Error: () => 0,
      });
      expect(value).toBe(0);
    });

    it("should getOr return default value", () => {
      const result: Result<number, string> = Result.Error("error");
      expect(result.getOr(42)).toBe(42);
    });

    it("should getWithDefault return default value", () => {
      const result: Result<number, string> = Result.Error("error");
      expect(result.getWithDefault(42)).toBe(42);
    });

    it("should convert to None option", () => {
      const result = Result.Error("error");
      const option = result.toOption();
      expect(option.tag).toBe("None");
    });
  });

  describe("Result namespace", () => {
    it("should create Ok from Result.Ok", () => {
      const result = Result.Ok(42);
      expect(result.isOk()).toBe(true);
    });

    it("should create Error from Result.Error", () => {
      const result = Result.Error("error");
      expect(result.isError()).toBe(true);
    });

    it("should check isOk", () => {
      const okResult = Result.Ok(42);
      const errorResult = Result.Error("error");
      expect(Result.isOk(okResult)).toBe(true);
      expect(Result.isOk(errorResult)).toBe(false);
    });

    it("should check isError", () => {
      const okResult = Result.Ok(42);
      const errorResult = Result.Error("error");
      expect(Result.isError(okResult)).toBe(false);
      expect(Result.isError(errorResult)).toBe(true);
    });

    it("should create Result from execution", () => {
      const successResult = Result.fromExecution(() => 42);
      expect(successResult.isOk()).toBe(true);
      if (successResult.isOk()) {
        expect(successResult.value).toBe(42);
      }

      const errorResult = Result.fromExecution(() => {
        throw new Error("test error");
      });
      expect(errorResult.isError()).toBe(true);
    });

    it("should combine all Ok results", () => {
      const results = [Result.Ok(1), Result.Ok(2), Result.Ok(3)];
      const combined = Result.all(results);
      expect(combined.isOk()).toBe(true);
      if (combined.isOk()) {
        expect(combined.value).toEqual([1, 2, 3]);
      }
    });

    it("should fail on first Error in all", () => {
      const results = [Result.Ok(1), Result.Error("error"), Result.Ok(3)];
      const combined = Result.all(results);
      expect(combined.isError()).toBe(true);
      if (combined.isError()) {
        expect(combined.error).toBe("error");
      }
    });
  });
});
