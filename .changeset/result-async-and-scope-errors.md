---
"@temporal-contract/contract": minor
"@temporal-contract/worker": minor
---

Close two `ResultAsync` rejection-handling gaps and widen the cancellation-scope error channel so domain errors stay on neverthrow's railway.

**`@temporal-contract/contract`:**

- New subpath export `@temporal-contract/contract/result-async` exposing `_internal_makeResultAsync`. This is the helper the client and worker packages already share — moved into `contract` so both consumers and any future first-party packages can use a single source of truth without duplicating it. The helper wraps a `() => Promise<Result<T, E>>` work function so synchronous throws and rejected promises route through a typed `err(...)` instead of leaking as unhandled rejections.
- `neverthrow` is declared as an **optional peer dependency** (`peerDependenciesMeta.neverthrow.optional: true`). Contract-only consumers who don't import the `/result-async` subpath don't need to install it.

**`@temporal-contract/worker`:**

- New `WorkflowScopeError` re-exported from `@temporal-contract/worker/workflow`. Wraps non-cancellation errors thrown inside `cancellableScope` / `nonCancellableScope`; the original error is preserved on `cause`.
- **Behavior change** for `cancellableScope` and `nonCancellableScope`: non-cancellation errors thrown by `fn` previously propagated as `ResultAsync` rejections (escaping neverthrow's railway). They now resolve to `err(WorkflowScopeError)`, so `result.match(...)` is exhaustive — every failure mode rides the railway. The error channel is widened to `WorkflowCancelledError | WorkflowScopeError`. Callers that relied on the old "let domain errors propagate as rejections" behavior should now branch on `instanceof WorkflowCancelledError` vs `instanceof WorkflowScopeError`.
- Internal: 5 worker call sites that previously used `new ResultAsync(work())` now use the shared `_internal_makeResultAsync` helper, closing a synchronous-throw gap that the client side had already fixed.
