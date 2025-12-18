import { describe, expect, it } from "vitest";
import { Future } from "./future.js";
import { Result } from "./result.js";

describe("Future", () => {
  describe("creation", () => {
    it("should create Future from value", async () => {
      // GIVEN
      const future = Future.value(42);

      // WHEN
      const value = await future;

      // THEN
      expect(value).toBe(42);
    });

    it("should create Future from executor", async () => {
      // GIVEN
      const future = Future.make<number>((resolve) => {
        resolve(42);
      });

      // WHEN
      const value = await future;

      // THEN
      expect(value).toBe(42);
    });

    it("should create Future from Promise with Ok result", async () => {
      // GIVEN
      const promise = Promise.resolve(42);
      const future = Future.fromPromise(promise);

      // WHEN
      const result = await future;

      // THEN
      expect(result.isOk()).toBe(true);
      if (result.isOk()) {
        expect(result.value).toBe(42);
      }
    });

    it("should create Future from Promise with Error result", async () => {
      // GIVEN
      const promise = Promise.reject(new Error("test error"));
      const future = Future.fromPromise(promise);

      // WHEN
      const result = await future;

      // THEN
      expect(result.isError()).toBe(true);
      if (result.isError()) {
        expect(result.error).toBeInstanceOf(Error);
      }
    });

    it("should create rejected Future", async () => {
      // GIVEN
      const future = Future.reject(new Error("test error"));

      // WHEN & THEN
      await expect(future).rejects.toThrow("test error");
    });
  });

  describe("transformations", () => {
    it("should map Future values", async () => {
      // GIVEN
      const future = Future.value(42);

      // WHEN
      const mapped = future.map((x) => x * 2);
      const value = await mapped;

      // THEN
      expect(value).toBe(84);
    });

    it("should flatMap Future values", async () => {
      // GIVEN
      const future = Future.value(42);

      // WHEN
      const flatMapped = future.flatMap((x) => Future.value(x * 2));
      const value = await flatMapped;

      // THEN
      expect(value).toBe(84);
    });

    it("should mapOk on Future<Result>", async () => {
      // GIVEN
      const future = Future.value(Result.Ok(42));

      // WHEN
      const mapped = future.mapOk((x) => x * 2);
      const result = await mapped;

      // THEN
      expect(result.isOk()).toBe(true);
      if (result.isOk()) {
        expect(result.value).toBe(84);
      }
    });

    it("should mapOk with type transformation on Future<Result>", async () => {
      // GIVEN
      const future = Future.value(Result.Ok(42));

      // WHEN
      const mapped = future.mapOk((x) => `value: ${x}`);
      const result = await mapped;

      // THEN
      expect(result.isOk()).toBe(true);
      if (result.isOk()) {
        expect(result.value).toBe("value: 42");
      }
    });

    it("should not mapOk on Future<Result> with Error", async () => {
      // GIVEN
      const future = Future.value(Result.Error("error"));

      // WHEN
      const mapped = future.mapOk((x: number) => x * 2);
      const result = await mapped;

      // THEN
      expect(result.isError()).toBe(true);
      if (result.isError()) {
        expect(result.error).toBe("error");
      }
    });

    it("should mapError on Future<Result>", async () => {
      // GIVEN
      const promise = Promise.reject(new Error("original error"));
      const future = Future.fromPromise(promise);

      // WHEN
      const mapped = future.mapError((error) => `Wrapped: ${(error as Error).message}`);
      const result = await mapped;

      // THEN
      expect(result.isError()).toBe(true);
      if (result.isError()) {
        expect(result.error).toBe("Wrapped: original error");
      }
    });

    it("should not mapError on Future<Result> with Ok", async () => {
      // GIVEN
      const future = Future.value(Result.Ok(42));

      // WHEN
      const mapped = future.mapError((e: string) => `Wrapped: ${e}`);
      const result = await mapped;

      // THEN
      expect(result.isOk()).toBe(true);
      if (result.isOk()) {
        expect(result.value).toBe(42);
      }
    });

    it("should flatMapOk on Future<Result>", async () => {
      // GIVEN
      const future = Future.value(Result.Ok(42));

      // WHEN
      const flatMapped = future.flatMapOk((x) => Future.value(Result.Ok(x * 2)));
      const result = await flatMapped;

      // THEN
      expect(result.isOk()).toBe(true);
      if (result.isOk()) {
        expect(result.value).toBe(84);
      }
    });

    it("should not flatMapOk on Future<Result> with Error", async () => {
      // GIVEN
      const future = Future.value(Result.Error("error"));

      // WHEN
      const flatMapped = future.flatMapOk((x: number) => Future.value(Result.Ok(x * 2)));
      const result = await flatMapped;

      // THEN
      expect(result.isError()).toBe(true);
      if (result.isError()) {
        expect(result.error).toBe("error");
      }
    });
  });

  describe("side effects", () => {
    it("should tap into Future values", async () => {
      // GIVEN
      let sideEffect = 0;
      const future = Future.value(42);

      // WHEN
      const tapped = future.tap((value) => {
        sideEffect = value;
      });
      const value = await tapped;

      // THEN
      expect(value).toBe(42);
      expect(sideEffect).toBe(42);
    });

    it("should tapOk on Future<Result>", async () => {
      // GIVEN
      let sideEffect = 0;
      const future = Future.value(Result.Ok(42));

      // WHEN
      const tapped = future.tapOk((value) => {
        sideEffect = value;
      });
      const result = await tapped;

      // THEN
      expect(result.isOk()).toBe(true);
      expect(sideEffect).toBe(42);
    });

    it("should not tapOk on Future<Result> with Error", async () => {
      // GIVEN
      let sideEffect = 0;
      const future = Future.value(Result.Error("error"));

      // WHEN
      const tapped = future.tapOk((value: number) => {
        sideEffect = value;
      });
      const result = await tapped;

      // THEN
      expect(result.isError()).toBe(true);
      expect(sideEffect).toBe(0);
    });

    it("should tapError on Future<Result>", async () => {
      // GIVEN
      let sideEffect = "";
      const future = Future.value(Result.Error("error"));

      // WHEN
      const tapped = future.tapError((error) => {
        sideEffect = error;
      });
      const result = await tapped;

      // THEN
      expect(result.isError()).toBe(true);
      expect(sideEffect).toBe("error");
    });

    it("should not tapError on Future<Result> with Ok", async () => {
      // GIVEN
      let sideEffect = "";
      const future = Future.value(Result.Ok(42));

      // WHEN
      const tapped = future.tapError((error: string) => {
        sideEffect = error;
      });
      const result = await tapped;

      // THEN
      expect(result.isOk()).toBe(true);
      expect(sideEffect).toBe("");
    });
  });

  describe("Promise interface", () => {
    it("should work with then", async () => {
      // GIVEN
      const future = Future.value(42);

      // WHEN
      const result = await future.then((value) => value * 2);

      // THEN
      expect(result).toBe(84);
    });

    it("should work with catch", async () => {
      // GIVEN
      const future = Future.reject(new Error("test error"));

      // WHEN
      const result = await future.catch((error) => (error as Error).message);

      // THEN
      expect(result).toBe("test error");
    });

    it("should work with finally", async () => {
      // GIVEN
      let finallyCalled = false;
      const future = Future.value(42);

      // WHEN
      await future.finally(() => {
        finallyCalled = true;
      });

      // THEN
      expect(finallyCalled).toBe(true);
    });

    it("should work with await", async () => {
      // GIVEN
      const future = Future.value(42);

      // WHEN
      const value = await future;

      // THEN
      expect(value).toBe(42);
    });
  });

  describe("static methods", () => {
    it("should combine all Futures", async () => {
      // GIVEN
      const futures = [Future.value(1), Future.value(2), Future.value(3)];

      // WHEN
      const combined = Future.all(futures);
      const values = await combined;

      // THEN
      expect(values).toEqual([1, 2, 3]);
    });

    it("should race Futures", async () => {
      // GIVEN
      const slow = Future.make<number>((resolve) => {
        setTimeout(() => resolve(1), 100);
      });
      const fast = Future.value(2);

      // WHEN
      const result = await Future.race([slow, fast]);

      // THEN
      expect(result).toBe(2);
    });
  });

  describe("conversion", () => {
    it("should convert to Promise", async () => {
      // GIVEN
      const future = Future.value(42);

      // WHEN
      const promise = future.toPromise();

      // THEN
      expect(promise).toBeInstanceOf(Promise);
      const value = await promise;
      expect(value).toBe(42);
    });
  });
});
