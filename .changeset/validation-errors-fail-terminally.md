---
"@temporal-contract/worker": minor
---

Make contract validation failures fail the execution terminally instead of hanging the workflow.

Previously, the worker's runtime validation errors (`WorkflowInputValidationError`, `WorkflowOutputValidationError`, `ActivityInputValidationError`, `ActivityOutputValidationError`, and the signal/query/update equivalents) were plain `Error`s. The TypeScript SDK classifies a non-`TemporalFailure` thrown from workflow code as a _Workflow Task_ failure and retries it indefinitely, so a deterministic validation failure produced a silently _hung_ workflow (stuck `Running`, only a repeating `WorkflowTaskFailed` event) rather than a failed execution. The same hazard applied at the activity boundary, where Temporal's default retry policy is unlimited. See [#251](https://github.com/btravers/temporal-contract/issues/251).

These error classes now extend Temporal's `ApplicationFailure` with `nonRetryable: true`. Because contract schemas are static, a validation failure can never pass on retry, so the execution now **fails fast and terminally** with a `WorkflowExecutionFailed` event. The concrete error name is preserved as the failure `type` (e.g. `"WorkflowInputValidationError"`), so it stays discriminable via `failure.type` after crossing Temporal's serialization boundary, and the failing field path remains in the human-readable `message`.

The error classes keep their names and identity, so existing `instanceof WorkflowInputValidationError` checks (and the new shared `ValidationError` base, now exported from `@temporal-contract/worker/workflow` and `/activity`) continue to work. If you previously wrapped `declareWorkflow(...)` to rethrow these as `ApplicationFailure.nonRetryable` yourself, that workaround is no longer needed.
