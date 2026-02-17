/**
 * Result type representing either a successful value (Ok) or an error (Err)
 * This is a custom implementation compatible with Temporal workflows
 *
 * Note: The error variant class is named `Err` internally to avoid shadowing
 * the global `Error` constructor. The public API still uses `Result.Error()`
 * as a factory and `isError()` as a type guard for backward compatibility.
 */

export type Result<T, E> = Ok<T, E> | Err<T, E>;

/**
 * Ok variant representing a successful result
 */
export class Ok<T, E> {
  readonly tag = "Ok" as const;
  readonly value: T;

  constructor(value: T) {
    this.value = value;
  }

  isOk(): this is Ok<T, E> {
    return true;
  }

  isError(): this is Err<T, E> {
    return false;
  }

  map<U>(fn: (value: T) => U): Result<U, E> {
    return new Ok(fn(this.value));
  }

  mapError<F>(_fn: (error: E) => F): Result<T, F> {
    return new Ok(this.value);
  }

  flatMap<U>(fn: (value: T) => Result<U, E>): Result<U, E> {
    return fn(this.value);
  }

  flatMapOk<U>(fn: (value: T) => Result<U, E>): Result<U, E> {
    return fn(this.value);
  }

  getOr(_defaultValue: T): T {
    return this.value;
  }

  getWithDefault(_defaultValue: T): T {
    return this.value;
  }

  match<R>(pattern: { Ok: (value: T) => R; Error: (error: E) => R }): R {
    return pattern.Ok(this.value);
  }

  toOption(): Option<T> {
    return { tag: "Some" as const, value: this.value };
  }
}

/**
 * Err variant representing a failed result.
 *
 * Named `Err` to avoid shadowing the global `Error` constructor.
 * Use `Result.Error()` factory or `isError()` type guard in consuming code.
 */
export class Err<T, E> {
  readonly tag = "Error" as const;
  readonly error: E;

  constructor(error: E) {
    this.error = error;
  }

  isOk(): this is Ok<T, E> {
    return false;
  }

  isError(): this is Err<T, E> {
    return true;
  }

  map<U>(_fn: (value: T) => U): Result<U, E> {
    return new Err(this.error);
  }

  mapError<F>(fn: (error: E) => F): Result<T, F> {
    return new Err(fn(this.error));
  }

  flatMap<U>(_fn: (value: T) => Result<U, E>): Result<U, E> {
    return new Err(this.error);
  }

  flatMapOk<U>(_fn: (value: T) => Result<U, E>): Result<U, E> {
    return new Err(this.error);
  }

  getOr(defaultValue: T): T {
    return defaultValue;
  }

  getWithDefault(defaultValue: T): T {
    return defaultValue;
  }

  match<R>(pattern: { Ok: (value: T) => R; Error: (error: E) => R }): R {
    return pattern.Error(this.error);
  }

  toOption(): Option<T> {
    return { tag: "None" as const };
  }
}

/**
 * Option type for Result.toOption()
 */
export type Option<T> = { tag: "Some"; value: T } | { tag: "None" };

/**
 * Result namespace with factory methods
 */
export const Result = {
  Ok: <T, E = never>(value: T): Result<T, E> => new Ok<T, E>(value),
  Error: <T = never, E = unknown>(error: E): Result<T, E> => new Err<T, E>(error),

  isOk: <T, E>(result: Result<T, E>): result is Ok<T, E> => result.isOk(),
  isError: <T, E>(result: Result<T, E>): result is Err<T, E> => result.isError(),

  fromExecution: <T, E = globalThis.Error>(fn: () => T): Result<T, E> => {
    try {
      return new Ok<T, E>(fn());
    } catch (error) {
      return new Err<T, E>(error as E);
    }
  },

  fromAsyncExecution: async <T, E = globalThis.Error>(
    fn: () => Promise<T>,
  ): Promise<Result<T, E>> => {
    try {
      return new Ok<T, E>(await fn());
    } catch (error) {
      return new Err<T, E>(error as E);
    }
  },

  all: <T, E>(results: Result<T, E>[]): Result<T[], E> => {
    const values: T[] = [];
    for (const result of results) {
      if (result.isError()) {
        return new Err(result.error);
      }
      values.push(result.value);
    }
    return new Ok(values);
  },
};
