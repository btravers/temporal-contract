# Global Activities

This document explains how to use global activities that are shared across all workflows in a contract.

## Overview

In Temporal applications, you often have activities that are used by multiple workflows:
- Sending emails or notifications
- Logging to external services
- Common database operations
- External API calls

`temporal-contract` supports defining these activities at the **contract level** so they're available to all workflows without duplicating definitions.

## Architecture

```
Contract
├── workflows
│   ├── processOrder
│   │   └── activities (workflow-specific)
│   │       └── validateInventory
│   └── notifyCustomer
│       └── activities (workflow-specific)
│           └── formatMessage
└── activities (global, shared by all workflows)
    ├── sendEmail
    ├── logEvent
    └── callExternalAPI
```

## Defining Global Activities

### Contract Definition

```typescript
import { z } from 'zod';
import { workflow, activity, contract } from '@temporal-contract/contract';

const myContract = contract({
  // Task queue for all workflows in this contract
  taskQueue: 'my-service',
  
  // Global activities available to ALL workflows
  activities: {
    sendEmail: activity({
      input: z.tuple([
        z.string().email(),           // recipient
        z.string(),                   // subject
        z.string(),                   // body
      ]),
      output: z.object({
        messageId: z.string(),
        sent: z.boolean(),
      }),
    }),
    
    logEvent: activity({
      input: z.tuple([
        z.string(),                   // eventName
        z.record(z.unknown()),        // metadata
      ]),
      output: z.object({
        logged: z.boolean(),
      }),
    }),
  },
  
  workflows: {
    processOrder: workflow({
      input: z.tuple([
        z.string(),                   // orderId
        z.string(),                   // customerId
      ]),
      output: z.object({
        status: z.string(),
      }),
      // Workflow-specific activities
      activities: {
        validateInventory: activity({
          input: z.tuple([z.string()]), // orderId
          output: z.object({
            available: z.boolean(),
          }),
        }),
      },
    }),
    
    notifyCustomer: workflow({
      input: z.tuple([
        z.string(),                   // customerId
        z.string(),                   // message
      ]),
      output: z.object({
        notified: z.boolean(),
      }),
      // This workflow has NO workflow-specific activities
      // It only uses global activities
    }),
  },
});

export default myContract;
```

## Implementing Workflows with Global Activities

### Workflow with Both Types of Activities

```typescript
import { createWorkflow } from '@temporal-contract/worker';
import myContract from './contract';

// This workflow has access to BOTH workflow-specific AND global activities
const processOrder = createWorkflow({
  definition: myContract.workflows.processOrder,
  contract: myContract, // ← Important: pass the contract to access global activities
  implementation: async (context, orderId, customerId) => {
    // Log the start (global activity)
    await context.activities.logEvent('order.started', {
      orderId,
      customerId,
    });
    
    // Validate inventory (workflow-specific activity)
    const inventory = await context.activities.validateInventory(orderId);
    
    if (!inventory.available) {
      // Log failure (global activity)
      await context.activities.logEvent('order.failed', {
        orderId,
        reason: 'out_of_stock',
      });
      
      // Send email notification (global activity)
      await context.activities.sendEmail(
        `customer-${customerId}@example.com`,
        'Order Failed',
        'Item is out of stock'
      );
      
      return { status: 'failed' };
    }
    
    // Log success (global activity)
    await context.activities.logEvent('order.completed', { orderId });
    
    return { status: 'completed' };
  },
});
```

### Workflow with Only Global Activities

```typescript
import { createWorkflow } from '@temporal-contract/worker';
import myContract from './contract';

// This workflow ONLY uses global activities
const notifyCustomer = createWorkflow({
  definition: myContract.workflows.notifyCustomer,
  contract: myContract, // ← Must provide contract to access global activities
  implementation: async (context, customerId, message) => {
    // Log notification attempt (global activity)
    await context.activities.logEvent('notification.sent', {
      customerId,
      messageLength: message.length,
    });
    
    // Send email (global activity)
    const result = await context.activities.sendEmail(
      `customer-${customerId}@example.com`,
      'Notification',
      message
    );
    
    return { notified: result.sent };
  },
});
```

## Implementing Global Activities

Global activities are implemented the same way as workflow-specific activities:

```typescript
import { createActivity } from '@temporal-contract/worker';
import myContract from './contract';

// Implement the sendEmail global activity
const sendEmail = createActivity({
  definition: myContract.activities!.sendEmail,
  implementation: async (recipient, subject, body) => {
    // recipient: string (validated as email)
    // subject: string
    // body: string
    
    console.log(`Sending email to ${recipient}`);
    
    const messageId = await emailService.send({
      to: recipient,
      subject,
      html: body,
    });
    
    return {
      messageId,
      sent: true,
    };
  },
});

// Implement the logEvent global activity
const logEvent = createActivity({
  definition: myContract.activities!.logEvent,
  implementation: async (eventName, metadata) => {
    // eventName: string
    // metadata: Record<string, unknown>
    
    await logger.info(eventName, metadata);
    
    return { logged: true };
  },
});

// Export for worker registration
export const globalActivities = {
  sendEmail,
  logEvent,
};
```

## Registering Activities in Worker

When creating a worker, register both global and workflow-specific activities:

```typescript
import { Worker } from '@temporalio/worker';
import { processOrder } from './workflows/process-order';
import { notifyCustomer } from './workflows/notify-customer';
import { globalActivities } from './activities/global';
import { orderActivities } from './activities/orders';

const worker = await Worker.create({
  workflowsPath: require.resolve('./workflows'),
  activities: {
    // Global activities
    ...globalActivities,
    // Workflow-specific activities
    ...orderActivities,
  },
  taskQueue: 'default',
});

await worker.run();
```

## Activity Priority and Overriding

When both global and workflow-specific activities have the same name, the **workflow-specific activity takes precedence**:

```typescript
const myContract = contract({
  activities: {
    sendNotification: activity({
      input: z.tuple([z.string()]),
      output: z.object({ sent: z.boolean() }),
    }),
  },
  workflows: {
    urgentWorkflow: workflow({
      // ...
      activities: {
        // This OVERRIDES the global sendNotification
        sendNotification: activity({
          input: z.tuple([z.string(), z.string()]), // Different signature
          output: z.object({ sent: z.boolean(), priority: z.string() }),
        }),
      },
    }),
  },
});

// In the workflow implementation:
createWorkflow({
  definition: myContract.workflows.urgentWorkflow,
  contract: myContract,
  implementation: async (context) => {
    // This calls the workflow-specific sendNotification, not the global one
    await context.activities.sendNotification('message', 'high');
  },
});
```

## Type Safety

TypeScript ensures that:

1. **Without contract**: Only workflow-specific activities are available
   ```typescript
   createWorkflow({
     definition: myContract.workflows.processOrder,
     // No contract provided
     implementation: async (context) => {
       context.activities.validateInventory('id'); // ✅ OK
       context.activities.sendEmail('...'); // ❌ Type error
     },
   });
   ```

2. **With contract**: Both global and workflow-specific activities are available
   ```typescript
   createWorkflow({
     definition: myContract.workflows.processOrder,
     contract: myContract, // ← Contract provided
     implementation: async (context) => {
       context.activities.validateInventory('id'); // ✅ OK
       context.activities.sendEmail('...', '...', '...'); // ✅ OK
     },
   });
   ```

3. **Auto-completion**: IDE provides suggestions for all available activities
   ```typescript
   context.activities. // ← Auto-complete shows all available activities
   ```

## Validation

All activity calls (global or workflow-specific) are automatically validated:

```typescript
// Input validation before network serialization
await context.activities.sendEmail(
  'invalid-email', // ❌ Runtime error: Invalid email format
  'Subject',
  'Body'
);

// Output validation after network deserialization
const result = await context.activities.logEvent('event', {});
// If activity returns { logged: "yes" } instead of { logged: true }
// ❌ Runtime error: Expected boolean, received string
```

## Best Practices

### 1. Use Global Activities for Common Operations

✅ **Good**: Shared utilities
```typescript
activities: {
  sendEmail: activity({ ... }),
  logEvent: activity({ ... }),
  callAPI: activity({ ... }),
}
```

❌ **Bad**: Workflow-specific logic
```typescript
activities: {
  processOrderStep1: activity({ ... }), // Too specific
  validateOrderInventory: activity({ ... }), // Too specific
}
```

### 2. Always Pass Contract When Using Global Activities

✅ **Good**: Explicit contract
```typescript
createWorkflow({
  definition: myContract.workflows.myWorkflow,
  contract: myContract, // ← Clear that global activities are available
  implementation: async (context) => {
    await context.activities.sendEmail(...);
  },
});
```

❌ **Bad**: Missing contract
```typescript
createWorkflow({
  definition: myContract.workflows.myWorkflow,
  // No contract - global activities won't be available
  implementation: async (context) => {
    await context.activities.sendEmail(...); // ❌ Type error
  },
});
```

### 3. Keep Activity Signatures Stable

Global activities are used across many workflows. Changing their signature is a breaking change:

✅ **Good**: Add optional parameters
```typescript
sendEmail: activity({
  input: z.tuple([
    z.string().email(),
    z.string(),
    z.string(),
    z.object({ attachments: z.array(z.string()) }).optional(), // ← Optional
  ]),
  // ...
}),
```

❌ **Bad**: Change required parameters
```typescript
sendEmail: activity({
  input: z.tuple([
    z.string().email(),
    z.string(),
    z.string(),
    z.string(), // ← Added required parameter - breaks existing workflows!
  ]),
  // ...
}),
```

### 4. Document Global Activities

Add descriptions to help developers understand usage:

```typescript
activities: {
  sendEmail: activity({
    input: z.tuple([
      z.string().email().describe('Recipient email address'),
      z.string().describe('Email subject'),
      z.string().describe('Email body (HTML supported)'),
    ]),
    output: z.object({
      messageId: z.string().describe('Unique message ID from email provider'),
      sent: z.boolean().describe('Whether email was sent successfully'),
    }),
  }),
}
```

## Summary

Global activities provide:

- ✅ **Code reuse**: Define common activities once
- ✅ **Type safety**: Full TypeScript support for global activities
- ✅ **Validation**: Automatic input/output validation
- ✅ **Flexibility**: Mix global and workflow-specific activities
- ✅ **Override capability**: Workflow-specific activities take precedence

Use global activities for operations that are shared across multiple workflows, and keep workflow-specific activities for domain logic unique to a single workflow.
