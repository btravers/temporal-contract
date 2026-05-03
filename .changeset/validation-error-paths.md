---
"@temporal-contract/worker": patch
"@temporal-contract/contract": patch
"@temporal-contract/client": patch
"@temporal-contract/boxed": patch
"@temporal-contract/testing": patch
---

Validation error messages now include the failing field's path.

Closes #141.

Standard Schema's `Issue` type carries a `path` (e.g. `["items", 0, "quantity"]`) but our error formatting was joining only `issue.message`, dropping the path. With nested input shapes you'd get unhelpful messages like:

```
Activity "matchItemsChunk" input validation failed:
  Invalid input: expected array, received undefined;
  Invalid input: expected number, received undefined
```

You now get:

```
Activity "matchItemsChunk" input validation failed:
  at items: Invalid input: expected array, received undefined;
  at items[0].quantity: Invalid input: expected number, received undefined
```

The format is dot+bracket notation (familiar to JS devs): top-level string keys appear bare, nested string keys with leading `.`, numeric keys as `[N]`. `PathSegment`-form path entries (the spec's alternative shape) and symbol keys are handled too.

Affects every validation error class in `@temporal-contract/worker` (activity input/output, workflow input/output, signal input, query input/output, update input/output) and `@temporal-contract/client` (workflow / query / signal / update validation errors). Child-workflow input/output validation messages in workflow.ts are also path-aware now.

The `issues` property on each error class is unchanged — programmatic consumers who walk `error.issues` and format their own output are unaffected.
