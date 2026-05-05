---
"@temporal-contract/contract": minor
"@temporal-contract/client": patch
"@temporal-contract/worker": patch
"@temporal-contract/testing": patch
---

Fix two TypeScript soundness bugs and add public name-helper types to `@temporal-contract/contract`.

**Soundness fixes** (previously made `args: unknown` and accepted any string as a signal name):

- `WorkflowDefinition` is now parameterized over `<TInput, TOutput, ...>`. Schema literal types flow through `defineWorkflow` so `client.startWorkflow("processOrder", { args: ??? })` infers `args` as the schema's inferred input type instead of `unknown`.
- Empty-collection generics default to `Record<string, never>` instead of `Record<string, ...Definition>`, so `keyof` of the default is genuinely empty. Typos in `signalName` / `queryName` / `updateName` on workflows that declare no signals/queries/updates are now compile-time errors.
- `& string` added to every `TWorkflowName extends keyof TContract["workflows"]` constraint; the compensating `as string` casts at the Temporal-API call sites are gone.

**New public exports from `@temporal-contract/contract`:**

- `AnyWorkflowDefinition` — widened-constraint alias used in `Record<string, …>` constraint positions and `T extends WorkflowDefinition` constraints. Lets the narrow `WorkflowDefinition` defaults stay narrow without breaking constraint-position usage.
- `SignalNamesOf<W>` / `QueryNamesOf<W>` / `UpdateNamesOf<W>` — distributive name-helper types that return `never` when the corresponding field is absent or `undefined` (handles `exactOptionalPropertyTypes`) and distribute correctly over union workflow types.

**Worker error rename**: `ChildWorkflowCancelledError`'s public field renamed from `childWorkflowName` to `workflowName`, matching the rest of the workflow-error surface (`WorkflowInputValidationError`, `ChildWorkflowNotFoundError`, etc.).
