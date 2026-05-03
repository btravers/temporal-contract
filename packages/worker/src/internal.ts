/**
 * Internal helpers shared across the worker package's entry points.
 *
 * Not part of the public API.
 */

/**
 * Extract the single payload from a Temporal handler's `...args` array.
 *
 * Temporal invokes handlers with whatever was passed via `args: [...]` at the
 * call site. The typed-contract layer always sends `args: [validatedInput]`,
 * so the common case is a one-element array containing the wrapped input.
 *
 * If a non-typed-contract caller passes multiple positional arguments
 * (`args: [a, b, c]`), we surface the whole array as the input — the schema
 * will then reject it unless the contract specifically modeled a tuple.
 */
export function extractHandlerInput(args: unknown[]): unknown {
  return args.length === 1 ? args[0] : args;
}
