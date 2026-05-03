/**
 * Internal helpers shared across the worker package's entry points.
 *
 * Not part of the public API — this module is not listed in the package's
 * `exports` map, so consumers can't import from `@temporal-contract/worker/internal`.
 * In-package tests import it directly via relative path.
 */
import { proxyActivities } from "@temporalio/workflow";
import type { ActivityOptions } from "@temporalio/workflow";
import type { ActivityDefinition } from "@temporal-contract/contract";

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

type ActivityFn = (...args: unknown[]) => Promise<unknown>;

/**
 * Build the raw `Record<name, fn>` proxy of activities for a workflow,
 * applying per-activity `ActivityOptions` overrides where requested.
 *
 * **Fast path (no overrides):** a single `proxyActivities(defaultOptions)`
 * call is made and returned directly. The proxy synthesizes a function for
 * any property access by name, so downstream code that looks up
 * `proxy[activityName]` works identically to before.
 *
 * **Override path:** one extra `proxyActivities(merged)` call is made *only*
 * for each activity that has an override. Activities without an entry keep
 * using the single default proxy. The result is a `Proxy` that returns the
 * override-bound function for named keys and falls back to the default proxy
 * for everything else — so the per-execution overhead scales with the number
 * of overrides, not the number of activities.
 *
 * Per-override merge is shallow: the override's properties replace the
 * default's, including the entire nested `retry` block. This matches
 * Temporal's "one ActivityOptions per `proxyActivities` call" semantics.
 */
export function buildRawActivitiesProxy(
  workflowActivities: Record<string, ActivityDefinition> | undefined,
  contractActivities: Record<string, ActivityDefinition> | undefined,
  defaultOptions: ActivityOptions,
  overrides: Partial<Record<string, ActivityOptions>> | undefined,
): Record<string, ActivityFn> {
  const defaultProxy = proxyActivities<Record<string, ActivityFn>>(defaultOptions);

  // Fast path: no overrides → use the single default proxy directly.
  // (`createValidatedActivities` accesses by name, so the Proxy's get-trap
  // suffices; we don't need an enumerable map.)
  const overrideEntries = overrides
    ? Object.entries(overrides).filter(
        (entry): entry is [string, ActivityOptions] => entry[1] !== undefined,
      )
    : [];
  if (overrideEntries.length === 0) {
    return defaultProxy;
  }

  // Validate every override key corresponds to a declared activity.
  // Without this, a typo at runtime (or a stale options bag from a renamed
  // activity) silently builds a proxy for a non-existent activity.
  const declared = new Set<string>([
    ...Object.keys(workflowActivities ?? {}),
    ...Object.keys(contractActivities ?? {}),
  ]);
  for (const [name] of overrideEntries) {
    if (!declared.has(name)) {
      throw new Error(
        `activityOptionsByName entry "${name}" does not match any declared activity. Available: ${[...declared].join(", ") || "none"}.`,
      );
    }
  }

  // Override path: build one proxy per override; combine with the default
  // proxy via a get-trap so unmatched keys still get the default options.
  const overriddenFns: Record<string, ActivityFn> = {};
  for (const [name, override] of overrideEntries) {
    const mergedOptions: ActivityOptions = { ...defaultOptions, ...override };
    const overrideProxy = proxyActivities<Record<string, ActivityFn>>(mergedOptions);
    const fn = overrideProxy[name];
    if (fn !== undefined) {
      overriddenFns[name] = fn;
    }
  }

  return new Proxy(overriddenFns, {
    get(target, prop) {
      if (typeof prop !== "string") return undefined;
      return target[prop] ?? defaultProxy[prop];
    },
  });
}
