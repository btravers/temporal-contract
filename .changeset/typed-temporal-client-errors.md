---
"@temporal-contract/client": minor
---

Discriminate Temporal client errors as typed `Result.Error` variants.

Closes #184.

## What ships

Three new error classes are surfaced from `@temporal-contract/client`, each catching a specific Temporal SDK error class and exposing it through the existing `Future<Result<...>>` shape so callers can branch on it without inspecting `error.cause` against `@temporalio/client` internals.

| Error class                      | Caught Temporal class                  | Surfaced from                                                                                                                         |
| -------------------------------- | -------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------- |
| `WorkflowAlreadyStartedError`    | `WorkflowExecutionAlreadyStartedError` | `startWorkflow`, `signalWithStart`, `executeWorkflow`                                                                                 |
| `WorkflowExecutionNotFoundError` | `WorkflowNotFoundError` (Temporal)     | handle methods (`signal`, `query`, `executeUpdate`, `terminate`, `cancel`, `describe`, `fetchHistory`), `executeWorkflow`, `result()` |
| `WorkflowFailedError`            | `WorkflowFailedError` (Temporal)       | `executeWorkflow`, `result()`                                                                                                         |

```ts
const result = await client.startWorkflow("processOrder", {
  workflowId: "order-1",
  args: { orderId: "ORD-1" },
});

result.match({
  Ok: (handle) => /* ... */,
  Error: (e) => {
    if (e instanceof WorkflowAlreadyStartedError) {
      // idempotent: re-fetch the existing handle and continue
    }
    // ...
  },
});
```

## Naming

`WorkflowExecutionNotFoundError` is named differently from the existing `WorkflowNotFoundError` (which signals a workflow not declared in the contract — a static contract check) so the two cases stay distinguishable. The Temporal-runtime variant takes the `Execution` qualifier to mirror Temporal's `WorkflowExecution*` server-side concepts.

## Backwards compatibility

The new error classes extend the existing union; previously these would surface as `RuntimeClientError`, which still catches every other thrown error. Existing `instanceof RuntimeClientError` checks continue to work for unrelated failures, but won't match the new discriminated variants — this is the point.
