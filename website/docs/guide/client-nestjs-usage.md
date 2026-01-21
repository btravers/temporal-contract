# NestJS Client Usage

Learn how to integrate temporal-contract client with NestJS for full dependency injection support.

## Overview

The `@temporal-contract/client-nestjs` package provides seamless integration between temporal-contract client and NestJS, enabling you to use NestJS's powerful dependency injection system to consume Temporal workflows.

## Installation

```bash
pnpm add @temporal-contract/client-nestjs @swan-io/boxed
```

## Quick Start

### 1. Configure the Client Module

Use `TemporalClientModule.forRootAsync` to configure the client:

```typescript
// app.module.ts
import { Module } from "@nestjs/common";
import { TemporalClientModule } from "@temporal-contract/client-nestjs";
import { Connection, Client } from "@temporalio/client";
import { myContract } from "./contract";
import { OrderService } from "./order.service";

@Module({
  imports: [
    TemporalClientModule.forRootAsync({
      useFactory: async () => {
        const connection = await Connection.connect({
          address: "localhost:7233",
        });
        return {
          contract: myContract,
          client: new Client({ connection }),
        };
      },
    }),
  ],
  providers: [OrderService],
})
export class AppModule {}
```

### 2. Use in Services

Inject `TemporalClientService` to access the typed client:

```typescript
// order.service.ts
import { Injectable } from "@nestjs/common";
import { TemporalClientService } from "@temporal-contract/client-nestjs";

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
      Ok: (value) => ({
        success: true,
        transactionId: value.transactionId,
      }),
      Error: (error) => ({
        success: false,
        error: error.message,
      }),
    });
  }
}
```

### 3. Use in Your Application

```typescript
// main.ts
import { NestFactory } from "@nestjs/core";
import { AppModule } from "./app.module";

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  await app.listen(3000);
  console.log("Application started on port 3000");
}

bootstrap();
```

## Dependency Injection

### Using with ConfigService

Access configuration values in the factory:

```typescript
import { ConfigModule, ConfigService } from "@nestjs/config";

@Module({
  imports: [
    ConfigModule.forRoot(),
    TemporalClientModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: async (config: ConfigService) => {
        const connection = await Connection.connect({
          address: config.get("TEMPORAL_ADDRESS", "localhost:7233"),
        });
        return {
          contract: myContract,
          client: new Client({
            connection,
            namespace: config.get("TEMPORAL_NAMESPACE", "default"),
          }),
        };
      },
    }),
  ],
})
export class AppModule {}
```

### Accessing the Client in Services

The client is available in any service through dependency injection:

```typescript
@Injectable()
export class OrderService {
  constructor(
    private readonly temporalClient: TemporalClientService,
    private readonly logger: Logger,
  ) {}

  async processOrder(orderId: string, customerId: string) {
    this.logger.log(`Processing order ${orderId}`);

    const client = this.temporalClient.getClient();
    const result = await client.executeWorkflow("processOrder", {
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
        throw new Error(`Order processing failed: ${error.message}`);
      },
    });
  }
}
```

## Module Configuration Options

### Synchronous Configuration

Use `forRoot` for simple, synchronous configuration:

```typescript
const connection = await Connection.connect({ address: "localhost:7233" });
const client = new Client({ connection });

TemporalClientModule.forRoot({
  contract: myContract,
  client: client,
});
```

### Asynchronous Configuration

Use `forRootAsync` for configuration that requires async setup or DI:

```typescript
TemporalClientModule.forRootAsync({
  imports: [ConfigModule],
  inject: [ConfigService],
  useFactory: async (config: ConfigService) => {
    const connection = await Connection.connect({
      address: config.get("TEMPORAL_ADDRESS"),
    });
    return {
      contract: myContract,
      client: new Client({ connection }),
    };
  },
});
```

## Working with Workflows

### Executing Workflows

```typescript
@Injectable()
export class OrderService {
  constructor(private readonly temporalClient: TemporalClientService) {}

  async executeOrder(orderId: string) {
    const client = this.temporalClient.getClient();

    const result = await client.executeWorkflow("processOrder", {
      workflowId: `order-${orderId}`,
      args: { orderId },
      workflowExecutionTimeout: "1 hour",
    });

    return result.match({
      Ok: (output) => output,
      Error: (error) => {
        throw new Error(`Workflow failed: ${error.message}`);
      },
    });
  }
}
```

### Starting Workflows Without Waiting

```typescript
@Injectable()
export class OrderService {
  constructor(private readonly temporalClient: TemporalClientService) {}

  async startOrder(orderId: string) {
    const client = this.temporalClient.getClient();

    const handleResult = await client.startWorkflow("processOrder", {
      workflowId: `order-${orderId}`,
      args: { orderId },
    });

    return handleResult.match({
      Ok: (handle) => ({
        workflowId: handle.workflowId,
        message: "Workflow started",
      }),
      Error: (error) => {
        throw new Error(`Failed to start workflow: ${error.message}`);
      },
    });
  }
}
```

### Querying Workflows

```typescript
@Injectable()
export class OrderQueryService {
  constructor(private readonly temporalClient: TemporalClientService) {}

  async getOrderStatus(workflowId: string) {
    const client = this.temporalClient.getClient();

    const handleResult = await client.getHandle("processOrder", workflowId);

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
}
```

### Signaling Workflows

```typescript
@Injectable()
export class OrderSignalService {
  constructor(private readonly temporalClient: TemporalClientService) {}

  async cancelOrder(workflowId: string, reason: string) {
    const client = this.temporalClient.getClient();

    const handleResult = await client.getHandle("processOrder", workflowId);

    return handleResult.match({
      Ok: async (handle) => {
        const signalResult = await handle.signals.cancelOrder({ reason });
        return signalResult.match({
          Ok: () => ({ success: true }),
          Error: (error) => {
            throw new Error(`Signal failed: ${error.message}`);
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

## Using with Controllers

### REST API Example

```typescript
import { Controller, Post, Get, Body, Param } from "@nestjs/common";
import { OrderService } from "./order.service";

@Controller("orders")
export class OrderController {
  constructor(private readonly orderService: OrderService) {}

  @Post()
  async createOrder(@Body() body: { orderId: string; customerId: string }) {
    return this.orderService.createOrder(body.orderId, body.customerId);
  }

  @Get(":workflowId/status")
  async getStatus(@Param("workflowId") workflowId: string) {
    return this.orderService.getOrderStatus(workflowId);
  }

  @Post(":workflowId/cancel")
  async cancelOrder(@Param("workflowId") workflowId: string) {
    return this.orderService.cancelOrder(workflowId);
  }
}
```

## Connection Management

### Reusing Connections

Create the connection once and reuse it:

```typescript
// connection.provider.ts
import { Connection } from "@temporalio/client";

export const TemporalConnectionProvider = {
  provide: "TEMPORAL_CONNECTION",
  useFactory: async () => {
    return Connection.connect({
      address: "localhost:7233",
    });
  },
};

// app.module.ts
@Module({
  imports: [
    TemporalClientModule.forRootAsync({
      inject: ["TEMPORAL_CONNECTION"],
      useFactory: async (connection: Connection) => {
        return {
          contract: myContract,
          client: new Client({ connection }),
        };
      },
    }),
  ],
  providers: [TemporalConnectionProvider],
})
export class AppModule {}
```

### Multiple Clients for Different Contracts

You can create specialized service classes for different contracts:

```typescript
// order-client.service.ts
@Injectable()
export class OrderClientService {
  private readonly client: TypedClient<typeof orderContract>;

  constructor(temporalClient: TemporalClientService) {
    this.client = temporalClient.getClient();
  }

  async processOrder(orderId: string) {
    return this.client.executeWorkflow("processOrder", {
      workflowId: `order-${orderId}`,
      args: { orderId },
    });
  }
}

// payment-client.service.ts
@Injectable()
export class PaymentClientService {
  private readonly client: TypedClient<typeof paymentContract>;

  constructor(temporalClient: TemporalClientService) {
    this.client = temporalClient.getClient();
  }

  async processPayment(paymentId: string) {
    return this.client.executeWorkflow("processPayment", {
      workflowId: `payment-${paymentId}`,
      args: { paymentId },
    });
  }
}
```

## Testing

### Testing Services

Mock the `TemporalClientService` in your tests:

```typescript
import { Test } from "@nestjs/testing";
import { TemporalClientService } from "@temporal-contract/client-nestjs";
import { Result } from "@swan-io/boxed";
import { describe, it, expect, beforeEach, vi } from "vitest";

describe("OrderService", () => {
  let service: OrderService;
  let mockClient: any;

  beforeEach(async () => {
    mockClient = {
      executeWorkflow: vi.fn(),
      startWorkflow: vi.fn(),
      getHandle: vi.fn(),
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

  it("should create order successfully", async () => {
    mockClient.executeWorkflow.mockResolvedValue(
      Result.Ok({
        status: "completed",
        transactionId: "tx-123",
      }),
    );

    const result = await service.createOrder("ORD-123", "CUST-456");

    expect(result.success).toBe(true);
    expect(result.transactionId).toBe("tx-123");
    expect(mockClient.executeWorkflow).toHaveBeenCalledWith(
      "processOrder",
      expect.objectContaining({
        workflowId: "order-ORD-123",
        args: { orderId: "ORD-123", customerId: "CUST-456" },
      }),
    );
  });

  it("should handle workflow errors", async () => {
    mockClient.executeWorkflow.mockResolvedValue(Result.Error(new Error("Payment failed")));

    const result = await service.createOrder("ORD-123", "CUST-456");

    expect(result.success).toBe(false);
    expect(result.error).toBe("Payment failed");
  });
});
```

## Best Practices

### 1. Organize by Domain

```typescript
// ✅ Good - organized by domain
src/
├── orders/
│   ├── order.service.ts
│   ├── order.controller.ts
│   ├── order.contract.ts
│   └── order.module.ts
├── payments/
│   ├── payment.service.ts
│   ├── payment.controller.ts
│   ├── payment.contract.ts
│   └── payment.module.ts
```

### 2. Use Global Modules for Shared Clients

The `TemporalClientModule` is global by default, so it's available in all modules:

```typescript
@Module({
  imports: [
    TemporalClientModule.forRootAsync({
      useFactory: async () => ({
        /* ... */
      }),
    }),
  ],
})
export class AppModule {}

// In any other module, TemporalClientService is available
@Module({
  providers: [OrderService], // Can inject TemporalClientService
})
export class OrderModule {}
```

### 3. Separate Business Logic from Workflow Execution

```typescript
// ✅ Good - business logic in services
@Injectable()
export class OrderBusinessService {
  async validateOrder(orderId: string) {
    // Validation logic
  }

  async calculateTotal(items: OrderItem[]) {
    // Calculation logic
  }
}

@Injectable()
export class OrderService {
  constructor(
    private readonly businessService: OrderBusinessService,
    private readonly temporalClient: TemporalClientService,
  ) {}

  async createOrder(orderId: string, items: OrderItem[]) {
    // Validate using business service
    await this.businessService.validateOrder(orderId);

    // Execute workflow
    const client = this.temporalClient.getClient();
    return client.executeWorkflow("processOrder", {
      workflowId: `order-${orderId}`,
      args: { orderId, items },
    });
  }
}
```

### 4. Handle Errors Appropriately

```typescript
@Injectable()
export class OrderService {
  constructor(
    private readonly temporalClient: TemporalClientService,
    private readonly logger: Logger,
  ) {}

  async createOrder(orderId: string) {
    const client = this.temporalClient.getClient();

    const result = await client.executeWorkflow("processOrder", {
      workflowId: `order-${orderId}`,
      args: { orderId },
    });

    return result.match({
      Ok: (value) => {
        this.logger.log(`Order ${orderId} completed: ${value.transactionId}`);
        return { success: true, data: value };
      },
      Error: (error) => {
        this.logger.error(`Order ${orderId} failed: ${error.message}`, error.stack);
        // Transform to application-specific error
        throw new OrderProcessingException(orderId, error.message);
      },
    });
  }
}
```

## Common Issues

### Connection Not Established

Ensure the connection is properly awaited in the factory:

```typescript
// ✅ Correct
useFactory: async () => ({
  contract: myContract,
  client: new Client({
    connection: await Connection.connect({ address: "localhost:7233" }),
  }),
});

// ❌ Wrong
useFactory: () => ({
  contract: myContract,
  client: new Client({
    connection: Connection.connect({ address: "localhost:7233" }),
  }),
});
```

### Client Not Available

Make sure `TemporalClientModule` is imported in your root module:

```typescript
@Module({
  imports: [
    TemporalClientModule.forRootAsync({
      /* ... */
    }),
  ],
})
export class AppModule {}
```

## See Also

- [Client Usage](/guide/client-usage) - Core client concepts
- [Defining Contracts](/guide/defining-contracts) - Creating contracts
- [Result Pattern](/guide/result-pattern) - Error handling with Result/Future
- [API Reference](/api/client-nestjs) - Complete NestJS client API
- [NestJS Worker Usage](/guide/worker-nestjs-usage) - NestJS worker integration
