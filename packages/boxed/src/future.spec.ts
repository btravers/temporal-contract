import { describe, expect, it } from "vitest";
import { Future } from "./future.js";
import { Result } from "./result.js";

describe("Future", () => {
  describe("creation", () => {
    it("should create Future from value", async () => {
      const future = Future.value(42);
      const value = await future;
      expect(value).toBe(42);
    });

    it("should create Future from executor", async () => {
      const future = Future.make<number>((resolve) => {
        resolve(42);
      });
      const value = await future;
      expect(value).toBe(42);
    });

    it("should create Future from Promise with Ok result", async () => {
      const promise = Promise.resolve(42);
      const future = Future.fromPromise(promise);
      const result = await future;
      expect(result.isOk()).toBe(true);
      if (result.isOk()) {
        expect(result.value).toBe(42);
      }
    });

    it("should create Future from Promise with Error result", async () => {
      const promise = Promise.reject(new Error("test error"));
      const future = Future.fromPromise(promise);
      const result = await future;
      expect(result.isError()).toBe(true);
      if (result.isError()) {
        expect(result.error).toBeInstanceOf(Error);
      }
    });

    it("should create rejected Future", async () => {
      const future = Future.reject(new Error("test error"));
      await expect(future).rejects.toThrow("test error");
    });
  });

  describe("transformations", () => {
    it("should map Future values", async () => {
      const future = Future.value(42);
      const mapped = future.map((x) => x * 2);
      const value = await mapped;
      expect(value).toBe(84);
    });

    it("should flatMap Future values", async () => {
      const future = Future.value(42);
      const flatMapped = future.flatMap((x) => Future.value(x * 2));
      const value = await flatMapped;
      expect(value).toBe(84);
    });

    it("should mapOk on Future<Result>", async () => {
      const future = Future.value(Result.Ok(42));
      const mapped = future.mapOk((x) => x * 2);
      const result = await mapped;
      expect(result.isOk()).toBe(true);
      if (result.isOk()) {
        expect(result.value).toBe(84);
      }
    });

    it("should mapOk with type transformation on Future<Result>", async () => {
      const future = Future.value(Result.Ok(42));
      const mapped = future.mapOk((x) => `value: ${x}`);
      const result = await mapped;
      expect(result.isOk()).toBe(true);
      if (result.isOk()) {
        expect(result.value).toBe("value: 42");
      }
    });

    it("should not mapOk on Future<Result> with Error", async () => {
      const future = Future.value(Result.Error("error"));
      const mapped = future.mapOk((x: number) => x * 2);
      const result = await mapped;
      expect(result.isError()).toBe(true);
      if (result.isError()) {
        expect(result.error).toBe("error");
      }
    });

    it("should mapError on Future<Result>", async () => {
      const promise = Promise.reject(new Error("original error"));
      const future = Future.fromPromise(promise);
      const mapped = future.mapError((error) => `Wrapped: ${(error as Error).message}`);
      const result = await mapped;
      expect(result.isError()).toBe(true);
      if (result.isError()) {
        expect(result.error).toBe("Wrapped: original error");
      }
    });

    it("should not mapError on Future<Result> with Ok", async () => {
      const future = Future.value(Result.Ok(42));
      const mapped = future.mapError((e: string) => `Wrapped: ${e}`);
      const result = await mapped;
      expect(result.isOk()).toBe(true);
      if (result.isOk()) {
        expect(result.value).toBe(42);
      }
    });

    it("should flatMapOk on Future<Result>", async () => {
      const future = Future.value(Result.Ok(42));
      const flatMapped = future.flatMapOk((x) => Future.value(Result.Ok(x * 2)));
      const result = await flatMapped;
      expect(result.isOk()).toBe(true);
      if (result.isOk()) {
        expect(result.value).toBe(84);
      }
    });

    it("should not flatMapOk on Future<Result> with Error", async () => {
      const future = Future.value(Result.Error("error"));
      const flatMapped = future.flatMapOk((x: number) => Future.value(Result.Ok(x * 2)));
      const result = await flatMapped;
      expect(result.isError()).toBe(true);
      if (result.isError()) {
        expect(result.error).toBe("error");
      }
    });
  });

  describe("side effects", () => {
    it("should tap into Future values", async () => {
      let sideEffect = 0;
      const future = Future.value(42);
      const tapped = future.tap((value) => {
        sideEffect = value;
      });
      const value = await tapped;
      expect(value).toBe(42);
      expect(sideEffect).toBe(42);
    });

    it("should tapOk on Future<Result>", async () => {
      let sideEffect = 0;
      const future = Future.value(Result.Ok(42));
      const tapped = future.tapOk((value) => {
        sideEffect = value;
      });
      const result = await tapped;
      expect(result.isOk()).toBe(true);
      expect(sideEffect).toBe(42);
    });

    it("should not tapOk on Future<Result> with Error", async () => {
      let sideEffect = 0;
      const future = Future.value(Result.Error("error"));
      const tapped = future.tapOk((value: number) => {
        sideEffect = value;
      });
      const result = await tapped;
      expect(result.isError()).toBe(true);
      expect(sideEffect).toBe(0);
    });

    it("should tapError on Future<Result>", async () => {
      let sideEffect = "";
      const future = Future.value(Result.Error("error"));
      const tapped = future.tapError((error) => {
        sideEffect = error;
      });
      const result = await tapped;
      expect(result.isError()).toBe(true);
      expect(sideEffect).toBe("error");
    });

    it("should not tapError on Future<Result> with Ok", async () => {
      let sideEffect = "";
      const future = Future.value(Result.Ok(42));
      const tapped = future.tapError((error: string) => {
        sideEffect = error;
      });
      const result = await tapped;
      expect(result.isOk()).toBe(true);
      expect(sideEffect).toBe("");
    });
  });

  describe("Promise interface", () => {
    it("should work with then", async () => {
      const future = Future.value(42);
      const result = await future.then((value) => value * 2);
      expect(result).toBe(84);
    });

    it("should work with catch", async () => {
      const future = Future.reject(new Error("test error"));
      const result = await future.catch((error) => (error as Error).message);
      expect(result).toBe("test error");
    });

    it("should work with finally", async () => {
      let finallyCalled = false;
      const future = Future.value(42);
      await future.finally(() => {
        finallyCalled = true;
      });
      expect(finallyCalled).toBe(true);
    });

    it("should work with await", async () => {
      const future = Future.value(42);
      const value = await future;
      expect(value).toBe(42);
    });
  });

  describe("static methods", () => {
    it("should combine all Futures", async () => {
      const futures = [Future.value(1), Future.value(2), Future.value(3)];
      const combined = Future.all(futures);
      const values = await combined;
      expect(values).toEqual([1, 2, 3]);
    });

    it("should race Futures", async () => {
      const slow = Future.make<number>((resolve) => {
        setTimeout(() => resolve(1), 100);
      });
      const fast = Future.value(2);
      const result = await Future.race([slow, fast]);
      expect(result).toBe(2);
    });
  });

  describe("conversion", () => {
    it("should convert to Promise", async () => {
      const future = Future.value(42);
      const promise = future.toPromise();
      expect(promise).toBeInstanceOf(Promise);
      const value = await promise;
      expect(value).toBe(42);
    });
  });
});
