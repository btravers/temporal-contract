# NestJS Integration

## Worker Module (`@temporal-contract/worker-nestjs`)

```typescript
import { TemporalModule } from "@temporal-contract/worker-nestjs";

@Module({
  imports: [
    TemporalModule.register({
      contract: myContract,
      connection: nativeConnection,
      workflowsPath: workflowsPathFromURL(import.meta.url, "./workflows.js"),
      activities: myActivities,
    }),
  ],
})
export class AppModule {}
```

## Client Module (`@temporal-contract/client-nestjs`)

```typescript
import { TemporalClientModule } from "@temporal-contract/client-nestjs";

@Module({
  imports: [
    TemporalClientModule.register({
      contract: myContract,
      client: temporalClient,
    }),
  ],
})
export class AppModule {}
```

## Injection

- `TemporalModule` provides the Temporal Worker as a NestJS service
- `TemporalClientModule` provides `TypedClient` injectable via `@Inject()`
- Both modules support `register()` for sync and `registerAsync()` for async configuration
