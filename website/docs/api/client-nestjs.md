# @temporal-contract/client-nestjs

NestJS integration for `@temporal-contract/client` providing a type-safe way to consume Temporal workflows with full dependency injection support.

## Installation

```bash
pnpm add @temporal-contract/client-nestjs @swan-io/boxed
```

## Features

- **ConfigurableModuleBuilder Integration**: Use NestJS's `ConfigurableModuleBuilder` for dynamic module configuration
- **Type-Safe Client**: Full type safety for workflow execution through the contract system
- **Full Dependency Injection**: Access the typed client from any NestJS service
- **Contract Validation**: Automatic validation through the contract system
- **Global Module**: Available in all modules without re-importing

## Quick Example

```typescript
import { Module, Injectable } from '@nestjs/common';
import { TemporalClientModule, TemporalClientService } from '@temporal-contract/client-nestjs';
import { Connection, Client } from '@temporalio/client';
import { Future, Result } from '@swan-io/boxed';
import { orderContract } from './contract';

@Module({
  imports: [
    TemporalClientModule.forRootAsync({
      useFactory: async () => {
        const connection = await Connection.connect({ address: 'localhost:7233' });
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

    const result = await client.executeWorkflow('processOrder', {
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

## API Reference

### TemporalClientModule

Dynamic NestJS module for configuring Temporal client.

#### Methods

##### `forRoot(options: TemporalClientModuleOptions): DynamicModule`

Synchronous configuration of the Temporal client.

**Parameters:**

- `options`: Configuration options for the client
  - `contract`: The temporal-contract definition
  - `client`: Temporal Client instance

**Example:**

```typescript
const connection = await Connection.connect({ address: 'localhost:7233' });
const client = new Client({ connection });

TemporalClientModule.forRoot({
  contract: myContract,
  client: client,
})
```

##### `forRootAsync(options: TemporalClientModuleAsyncOptions): DynamicModule`

Asynchronous configuration of the Temporal client with factory pattern.

**Parameters:**

- `options`: Async configuration options
  - `imports?`: Modules to import
  - `inject?`: Dependencies to inject into factory
  - `useFactory`: Factory function returning configuration
  - `name?`: Unique name for multiple clients

**Example:**

```typescript
TemporalClientModule.forRootAsync({
  imports: [ConfigModule],
  inject: [ConfigService],
  useFactory: async (config: ConfigService) => {
    const connection = await Connection.connect({
      address: config.get('TEMPORAL_ADDRESS'),
    });
    return {
      contract: myContract,
      client: new Client({
        connection,
        namespace: config.get('TEMPORAL_NAMESPACE'),
      }),
    };
  },
})
```

### TemporalClientService

Service providing access to the typed Temporal client.

#### Methods

##### `getClient(): TypedClient<TContract>`

Get the typed client instance.

**Returns:** The TypedClient instance configured with the contract

**Example:**

```typescript
@Injectable()
export class MyService {
  constructor(private readonly temporalClient: TemporalClientService) {}

  async executeWorkflow() {
    const client = this.temporalClient.getClient();
    const result = await client.executeWorkflow('myWorkflow', {
      workflowId: 'my-workflow-123',
      args: { /* ... */ },
    });
    return result;
  }
}
```

#### Lifecycle Hooks

The service automatically manages client lifecycle:

- **onModuleDestroy()**: Gracefully cleans up when the module is destroyed

## Configuration Options

### TemporalClientModuleOptions

```typescript
interface TemporalClientModuleOptions {
  contract: ContractDefinition;
  client: Client;
}
```

### TemporalClientModuleAsyncOptions

```typescript
interface TemporalClientModuleAsyncOptions {
  imports?: Type<any>[];
  inject?: (string | symbol | Type<any>)[];
  useFactory: (...args: any[]) => Promise<TemporalClientModuleOptions> | TemporalClientModuleOptions;
  name?: string;
}
```

## Usage Patterns

### With Dependency Injection

```typescript
@Injectable()
export class OrderService {
  constructor(
    private readonly temporalClient: TemporalClientService,
    private readonly logger: Logger,
  ) {}

  async processOrder(orderId: string, customerId: string) {
    this.logger.log(`Processing order ${orderId} for customer ${customerId}`);

    const client = this.temporalClient.getClient();
    const result = await client.executeWorkflow('processOrder', {
      workflowId: `order-${orderId}`,
      args: { orderId, customerId },
    });

    return result.match({
      Ok: (value) => {
        this.logger.log(`Order ${orderId} processed successfully`);
        return value;
      },
      Error: (error) => {
        this.logger.error(`Order ${orderId} failed: ${error.message}`);
        throw error;
      },
    });
  }
}
```

### Working with Workflow Handles

```typescript
@Injectable()
export class OrderQueryService {
  constructor(private readonly temporalClient: TemporalClientService) {}

  async getOrderStatus(workflowId: string) {
    const client = this.temporalClient.getClient();

    const handleResult = await client.getHandle('processOrder', workflowId);

    return handleResult.match({
      Ok: async (handle) => {
        const statusResult = await handle.queries.getStatus({});
        return statusResult.match({
          Ok: (status) => status,
          Error: (error) => {
            throw new Error(`Query failed: ${error.message}`);
          },
        });
      },
      Error: (error) => {
        throw new Error(`Workflow not found: ${error.message}`);
      },
    });
  }

  async cancelOrder(workflowId: string) {
    const client = this.temporalClient.getClient();

    const handleResult = await client.getHandle('processOrder', workflowId);

    return handleResult.match({
      Ok: async (handle) => {
        const cancelResult = await handle.cancel();
        return cancelResult.match({
          Ok: () => ({ success: true }),
          Error: (error) => {
            throw new Error(`Cancel failed: ${error.message}`);
          },
        });
      },
      Error: (error) => {
        throw new Error(`Workflow not found: ${error.message}`);
      },
    });
  }
}
```

### Multiple Contracts

For working with multiple contracts, you can create multiple service classes:

```typescript
@Injectable()
export class OrderClientService {
  private readonly client: TypedClient<typeof orderContract>;

  constructor(temporalClient: TemporalClientService) {
    this.client = temporalClient.getClient();
  }

  async processOrder(orderId: string) {
    return this.client.executeWorkflow('processOrder', {
      workflowId: `order-${orderId}`,
      args: { orderId },
    });
  }
}

@Injectable()
export class PaymentClientService {
  private readonly client: TypedClient<typeof paymentContract>;

  constructor(temporalClient: TemporalClientService) {
    this.client = temporalClient.getClient();
  }

  async processPayment(paymentId: string) {
    return this.client.executeWorkflow('processPayment', {
      workflowId: `payment-${paymentId}`,
      args: { paymentId },
    });
  }
}
```

## Testing

Test your services with NestJS testing utilities:

```typescript
import { Test } from '@nestjs/testing';
import { TemporalClientService } from '@temporal-contract/client-nestjs';
import { Result } from '@swan-io/boxed';

describe('OrderService', () => {
  let service: OrderService;
  let mockClient: any;

  beforeEach(async () => {
    mockClient = {
      executeWorkflow: jest.fn(),
      getHandle: jest.fn(),
    };

    const mockTemporalClientService = {
      getClient: () => mockClient,
    };

    const module = await Test.createTestingModule({
      providers: [
        OrderService,
        {
          provide: TemporalClientService,
          useValue: mockTemporalClientService,
        },
      ],
    }).compile();

    service = module.get<OrderService>(OrderService);
  });

  it('should process order successfully', async () => {
    mockClient.executeWorkflow.mockResolvedValue(
      Result.Ok({ status: 'completed', transactionId: 'tx-123' })
    );

    const result = await service.processOrder('ORD-123', 'CUST-456');

    expect(result.status).toBe('completed');
    expect(mockClient.executeWorkflow).toHaveBeenCalledWith(
      'processOrder',
      expect.objectContaining({
        workflowId: 'order-ORD-123',
        args: { orderId: 'ORD-123', customerId: 'CUST-456' },
      })
    );
  });

  it('should handle workflow errors', async () => {
    mockClient.executeWorkflow.mockResolvedValue(
      Result.Error(new Error('Workflow failed'))
    );

    await expect(
      service.processOrder('ORD-123', 'CUST-456')
    ).rejects.toThrow('Order processing failed');
  });
});
```

## See Also

- [NestJS Client Usage Guide](/guide/client-nestjs-usage) - Detailed usage guide
- [Client Usage](/guide/client-usage) - Core client concepts
- [Defining Contracts](/guide/defining-contracts) - Creating contracts
- [@temporal-contract/client](/api/client) - Core client package
- [@temporal-contract/worker-nestjs](/api/worker-nestjs) - NestJS worker integration

## License

MIT
