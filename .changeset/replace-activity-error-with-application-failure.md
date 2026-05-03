---
"@temporal-contract/worker": major
---

**BREAKING:** Replace `ActivityError` with Temporal's `ApplicationFailure`.

Closes #121.

`ActivityError` is gone. Activities now return `Future<Result<Output, ApplicationFailure>>` instead of `Future<Result<Output, ActivityError>>`. `ApplicationFailure` is Temporal's first-class failure shape and gives consumers per-instance `nonRetryable` (closes #121), structured `details`, and the `BENIGN` observability category — all preserved across the activity → workflow serialization boundary that previously flattened our custom class to `ApplicationFailure` anyway.

`ApplicationFailure` is re-exported from `@temporal-contract/worker/activity` so consumers don't need a separate `@temporalio/common` import:

```ts
import { declareActivitiesHandler, ApplicationFailure } from "@temporal-contract/worker/activity";
import { Future } from "@swan-io/boxed";

export const activities = declareActivitiesHandler({
  contract,
  activities: {
    chargePayment: ({ amount }) => {
      return Future.fromPromise(paymentGateway.charge(amount))
        .mapError((error) =>
          ApplicationFailure.create({
            type: "PAYMENT_FAILED",
            message: error instanceof Error ? error.message : "Payment failed",
            // Per-instance non-retryable: Temporal stops retrying immediately.
            nonRetryable: false,
            ...(error instanceof Error ? { cause: error } : {}),
          }),
        )
        .mapOk((tx) => ({ transactionId: tx.id }));
    },
  },
});
```

## Migration

Replace each `new ActivityError(code, message, cause)` with `ApplicationFailure.create({ type: code, message, cause, nonRetryable })`. The third positional `cause` argument moves into the options bag, and the `code` field becomes `type`.

```ts
// Before
new ActivityError("PAYMENT_FAILED", "Card declined", error);

// After
ApplicationFailure.create({
  type: "PAYMENT_FAILED",
  message: "Card declined",
  cause: error instanceof Error ? error : undefined,
});
```

`@temporalio/common` is added as a peer dependency for the `ApplicationFailure` re-export.
