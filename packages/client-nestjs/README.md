# @temporal-contract/client-nestjs

NestJS integration for `@temporal-contract/client` providing a type-safe way to consume Temporal workflows with full dependency injection support.

## Installation

```bash
pnpm add @temporal-contract/client-nestjs @temporal-contract/contract @temporal-contract/client @temporalio/client
```

## Features

- **ConfigurableModuleBuilder Integration**: Use NestJS's `ConfigurableModuleBuilder` for dynamic module configuration
- **Type-Safe Client**: Full type safety for workflow execution through the contract system
- **Full Dependency Injection**: Access the typed client from any NestJS service
- **Contract Validation**: Automatic validation through the contract system
- **Global Module**: Available in all modules without re-importing

## Quick Example

```typescript
import { Module, Injectable } from "@nestjs/common";
import { TemporalClientModule, TemporalClientService } from "@temporal-contract/client-nestjs";
import { Connection, Client } from "@temporalio/client";
import { orderContract } from "./contract";

@Module({
  imports: [
    TemporalClientModule.forRootAsync({
      useFactory: async () => {
        const connection = await Connection.connect({ address: "localhost:7233" });
        return {
          contract: orderContract,
          client: new Client({ connection }),
        };
      },
    }),
  ],
  providers: [OrderService],
})
export class AppModule {}

@Injectable()
export class OrderService {
  constructor(private readonly temporalClient: TemporalClientService) {}

  async createOrder(orderId: string, customerId: string) {
    const client = this.temporalClient.getClient();

    const result = await client.executeWorkflow("processOrder", {
      workflowId: `order-${orderId}`,
      args: { orderId, customerId },
    });

    return result.match({
      Ok: (value) => value,
      Error: (error) => {
        throw new Error(`Order processing failed: ${error.message}`);
      },
    });
  }
}
```

## Usage

### Synchronous Configuration

Use `forRoot` for simple, synchronous configuration:

```typescript
import { Module } from "@nestjs/common";
import { TemporalClientModule } from "@temporal-contract/client-nestjs";
import { Connection, Client } from "@temporalio/client";
import { myContract } from "./contract";

const connection = await Connection.connect({ address: "localhost:7233" });
const client = new Client({ connection });

@Module({
  imports: [
    TemporalClientModule.forRoot({
      contract: myContract,
      client: client,
    }),
  ],
})
export class AppModule {}
```

### Asynchronous Configuration

Use `forRootAsync` for configuration that requires async setup or DI:

```typescript
import { Module } from "@nestjs/common";
import { ConfigModule, ConfigService } from "@nestjs/config";
import { TemporalClientModule } from "@temporal-contract/client-nestjs";
import { Connection, Client } from "@temporalio/client";
import { myContract } from "./contract";

@Module({
  imports: [
    ConfigModule.forRoot(),
    TemporalClientModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: async (config: ConfigService) => {
        const connection = await Connection.connect({
          address: config.get("TEMPORAL_ADDRESS"),
        });
        return {
          contract: myContract,
          client: new Client({
            connection,
            namespace: config.get("TEMPORAL_NAMESPACE"),
          }),
        };
      },
    }),
  ],
})
export class AppModule {}
```

### Using in Services

Inject the `TemporalClientService` to access the typed client:

```typescript
import { Injectable } from "@nestjs/common";
import { TemporalClientService } from "@temporal-contract/client-nestjs";

@Injectable()
export class OrderService {
  constructor(private readonly temporalClient: TemporalClientService) {}

  async processOrder(orderId: string, customerId: string) {
    const client = this.temporalClient.getClient();

    const result = await client.executeWorkflow("processOrder", {
      workflowId: `order-${orderId}`,
      args: { orderId, customerId },
    });

    return result.match({
      Ok: (value) => ({ success: true, data: value }),
      Error: (error) => ({ success: false, error: error.message }),
    });
  }

  async getOrderStatus(workflowId: string) {
    const client = this.temporalClient.getClient();

    const handleResult = await client.getHandle("processOrder", workflowId);

    return handleResult.match({
      Ok: async (handle) => {
        const queryResult = await handle.queries.getStatus({});
        return queryResult.match({
          Ok: (status) => status,
          Error: (error) => {
            throw new Error(`Query failed: ${error.message}`);
          },
        });
      },
      Error: (error) => {
        throw new Error(`Failed to get handle: ${error.message}`);
      },
    });
  }
}
```

## Multiple Clients

You can configure multiple clients for different contracts:

```typescript
@Module({
  imports: [
    TemporalClientModule.forRootAsync({
      useFactory: async () => {
        const connection = await Connection.connect({ address: "localhost:7233" });
        return {
          contract: orderContract,
          client: new Client({ connection }),
        };
      },
    }),
    // For multiple contracts, create separate modules or use providers
  ],
})
export class AppModule {}
```

## Testing

Mock the `TemporalClientService` in your tests:

```typescript
import { Test } from "@nestjs/testing";
import { TemporalClientService } from "@temporal-contract/client-nestjs";
import { Result } from "@swan-io/boxed";

describe("OrderService", () => {
  let service: OrderService;
  let mockTemporalClient: TemporalClientService;

  beforeEach(async () => {
    const mockClient = {
      executeWorkflow: vi
        .fn()
        .mockResolvedValue(Result.Ok({ status: "success", transactionId: "tx-123" })),
    };

    mockTemporalClient = {
      getClient: () => mockClient,
    } as any;

    const module = await Test.createTestingModule({
      providers: [
        OrderService,
        {
          provide: TemporalClientService,
          useValue: mockTemporalClient,
        },
      ],
    }).compile();

    service = module.get<OrderService>(OrderService);
  });

  it("should process order", async () => {
    const result = await service.processOrder("ORD-123", "CUST-456");
    expect(result.success).toBe(true);
  });
});
```

## API Reference

See the [API documentation](/api/client-nestjs) for detailed information.

## See Also

- [Client Usage Guide](/guide/client-usage) - General client usage
- [NestJS Client Usage Guide](/guide/client-nestjs-usage) - Detailed NestJS integration
- [@temporal-contract/client](/api/client) - Core client package
- [@temporal-contract/worker-nestjs](/api/worker-nestjs) - NestJS worker integration

## License

MIT
