/**
 * Custom implementation of Future and Result patterns for Temporal workflows
 *
 * This package provides a Temporal-compatible implementation of the Result and Future
 * patterns that were originally provided by @swan-io/boxed.
 *
 * @packageDocumentation
 */

export { Result, Ok, Err } from "./result.js";
export type { Option } from "./result.js";
export { Future } from "./future.js";
