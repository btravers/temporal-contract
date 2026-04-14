---
"@temporal-contract/worker": minor
---

Add `perActivityOptions` to `declareWorkflow` for per-activity `ActivityOptions`

It is now possible to specify `ActivityOptions` per activity, overriding the default `activityOptions`. Per-activity options are merged with the default options (per-activity values take precedence).

```ts
export const processOrder = declareWorkflow({
  workflowName: 'processOrder',
  contract: myContract,
  activityOptions: { startToCloseTimeout: '1 minute' },
  perActivityOptions: {
    chargePayment: { startToCloseTimeout: '30 seconds', retry: { maximumAttempts: 1 } },
    sendEmail: { startToCloseTimeout: '5 minutes' },
  },
  implementation: async (context, args) => { ... },
});
```

`activityOptions` is now optional — you can rely solely on `perActivityOptions` if you prefer to configure each activity individually.
