/**
 * Interoperability utilities for @swan-io/boxed
 *
 * This module provides bi-directional mapping between @temporal-contract/boxed
 * and @swan-io/boxed types to ensure smooth migration and interoperability.
 */

import { Result } from "./result.js";
import { Future } from "./future.js";
import { Result as SwanResult, Future as SwanFuture } from "@swan-io/boxed";

/**
 * Re-export @swan-io/boxed types for convenience
 */
export type { SwanResult, SwanFuture };

/**
 * Convert @swan-io/boxed Result to @temporal-contract/boxed Result
 */
export function fromSwanResult<T, E>(swanResult: SwanResult<T, E>): Result<T, E> {
  return swanResult.match({
    Ok: (value) => Result.Ok(value),
    Error: (error) => Result.Error(error),
  });
}

/**
 * Convert @temporal-contract/boxed Result to @swan-io/boxed compatible Result
 *
 * Note: This returns our Result type which implements the same interface,
 * making it compatible with @swan-io/boxed consumers.
 */
export function toSwanResult<T, E>(result: Result<T, E>): SwanResult<T, E> {
  return result.match({
    Ok: (value) => SwanResult.Ok(value),
    Error: (error) => SwanResult.Error(error),
  });
}

/**
 * Convert @swan-io/boxed Future to @temporal-contract/boxed Future
 */
export function fromSwanFuture<T>(swanFuture: SwanFuture<T>): Future<T> {
  return Future.make((resolve) => {
    swanFuture.tap(resolve);
  });
}

/**
 * Convert @temporal-contract/boxed Future to @swan-io/boxed compatible Future
 *
 * Note: This returns our Future type which implements the same interface,
 * making it compatible with @swan-io/boxed consumers.
 */
export function toSwanFuture<T>(future: Future<T>): SwanFuture<T> {
  return SwanFuture.make((resolve) => {
    future.tap(resolve);
  });
}

/**
 * Convert @swan-io/boxed Future<Result> to @temporal-contract/boxed Future<Result>
 */
export function fromSwanFutureResult<T, E>(
  swanFutureResult: SwanFuture<SwanResult<T, E>>,
): Future<Result<T, E>> {
  return fromSwanFuture(swanFutureResult.map((swanResult) => fromSwanResult(swanResult)));
}

/**
 * Convert @temporal-contract/boxed Future<Result> to @swan-io/boxed compatible Future<Result>
 */
export function toSwanFutureResult<T, E>(
  futureResult: Future<Result<T, E>>,
): SwanFuture<SwanResult<T, E>> {
  return toSwanFuture(futureResult.map((result) => toSwanResult(result)));
}
