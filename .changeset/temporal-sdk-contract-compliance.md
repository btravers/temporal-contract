---
"@temporal-contract/worker": minor
---

Align with documented Temporal SDK contracts for `proxyActivities` and Update handlers.

**`proxyActivities` is now hoisted to declaration time.** Previously it was called inside the closure returned from `declareWorkflow`, which meant every workflow invocation re-ran the registration. The Temporal SDK documents `proxyActivities` as a module-scope helper — it registers stub functions and may carry bookkeeping (validator pre-registration, payload-converter caching) that breaks if re-invoked per run. The call now happens once at `declareWorkflow` time.

The validation wrapper (`createValidatedActivities`) is hoisted alongside it; the resulting `contextActivities` map is `Object.freeze`d before being exposed on the workflow context, and `WorkflowContext.activities` is now typed `Readonly<...>`. This prevents stray mutations in one workflow run from leaking into later runs in the same isolate.

**Update handlers now use Temporal's `validator` slot.** `bindUpdateHandler` previously ran schema validation inside the async handler body, which meant bad input produced a workflow history event for a rejected update and surfaced as `WorkflowUpdateFailedError` on the client. Validation now runs synchronously in the `validator` passed to `setHandler`, so:

- Invalid input is rejected at admission time with **no history event written**.
- Clients receive `WorkflowUpdateValidationRejectedError` (Temporal's admission-rejection error class) instead of `WorkflowUpdateFailedError`. **This is the only consumer-visible change** — handle invalid update input by checking that error class instead.
- Async input schemas are now rejected with a clear message at handler-binding time (mirroring the existing query-handler guard); use synchronous schemas for update inputs.

Output validation continues to run inside the handler body, since update output isn't admission-gated.
