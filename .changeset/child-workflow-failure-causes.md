---
"@temporal-contract/worker": minor
"@temporal-contract/client": minor
---

Make the worker-side child-workflow error model coherent with the client-side parent-workflow error model, and tighten `WorkflowFailedError.cause` typing.

**Worker (`@temporal-contract/worker`):**

- New `ChildWorkflowCancelledError` discriminant — `extends ChildWorkflowError`, so existing `instanceof ChildWorkflowError` checks keep matching cancellations while `instanceof ChildWorkflowCancelledError` lets callers narrow further. Re-exported from `@temporal-contract/worker/workflow`.
- New `classifyChildWorkflowError` internal helper mirrors the client-side `classifyResultError` pattern: cancellation (via `isCancellation`) takes priority, then `ChildWorkflowFailure → cause` unwrapping, then a generic fallback.
- `startChildWorkflow` / `executeChildWorkflow` now correctly forward Temporal's nested `ApplicationFailure` / `TimeoutFailure` / `TerminatedFailure` cause through `ChildWorkflowError.cause` instead of wrapping the raw `ChildWorkflowFailure`. Consumers can now match `err.cause instanceof ApplicationFailure` in one step. `ChildWorkflowNotFoundError` is now part of the return-type union.

**Client (`@temporal-contract/client`):**

- New public `TemporalFailure` union type re-exported from `@temporalio/common`: `ApplicationFailure | CancelledFailure | TerminatedFailure | TimeoutFailure | ChildWorkflowFailure | ServerFailure | ActivityFailure`.
- `WorkflowFailedError.cause` re-typed from `unknown` to `TemporalFailure | undefined`. `classifyResultError` already produced this shape at runtime; the type now matches. Consumers can `instanceof`-match the cause directly without a manual narrow.
