# Validation Flow

This document explains how `temporal-contract` ensures data integrity across all network boundaries in a Temporal application.

## Architecture Overview

```
┌─────────────────────────────────────────────────────────────────┐
│                           CLIENT                                │
│                                                                 │
│  client.executeWorkflow('processOrder', {                       │
│    workflowId: 'order-123',                                     │
│    args: ['ORD-123', 'CUST-456', [...items]]                    │
│  })                                                             │
│                                                                 │
│  ✓ Input validated with workflow.input schema (z.tuple)         │
└──────────────────────────┬──────────────────────────────────────┘
                           │ Network (Serialization)
                           ▼
┌─────────────────────────────────────────────────────────────────┐
│                         WORKFLOW                                │
│                                                                 │
│  createWorkflow({                                               │
│    definition: myContract.workflows.processOrder,               │
│    implementation: async (context, orderId, customerId, items)  │
│  })                                                             │
│                                                                 │
│  ✓ Input validated on receive (z.tuple parse)                   │
│                                                                 │
│  ┌─────────────────────────────────────────────────────────┐    │
│  │  Activity Call:                                         │    │
│  │  context.activities.validateInventory(productId, qty)   │    │
│  │                                                         │    │
│  │  ✓ Arguments validated with activity.input schema       │    │
│  └───────────────────────┬─────────────────────────────────┘    │
│                          │ Network (Serialization)              │
│                          ▼                                      │
│  ┌─────────────────────────────────────────────────────────┐    │
│  │                      ACTIVITY                           │    │
│  │                                                         │    │
│  │  createActivity({                                       │    │
│  │    definition: validateInventory,                       │    │
│  │    implementation: async (productId, qty) => {...}      │    │
│  │  })                                                     │    │
│  │                                                         │    │
│  │  ✓ Input validated on receive (z.tuple parse)           │    │
│  │  ✓ Output validated before return (z.object parse)      │    │
│  └───────────────────────┬─────────────────────────────────┘    │
│                          │ Network (Serialization)              │
│                          ▼                                      │
│  ┌─────────────────────────────────────────────────────────┐    │
│  │  Activity Result:                                       │    │
│  │  { available: true, reservationId: '...' }              │    │
│  │                                                         │    │
│  │  ✓ Result validated with activity.output schema         │    │
│  └─────────────────────────────────────────────────────────┘    │
│                                                                 │
│  ✓ Workflow output validated before return                      │
└──────────────────────────┬──────────────────────────────────────┘
                           │ Network (Serialization)
                           ▼
┌─────────────────────────────────────────────────────────────────┐
│                           CLIENT                                │
│                                                                 │
│  result = { orderId, status, totalAmount }                      │
│                                                                 │
│  ✓ Output validated with workflow.output schema                 │
└─────────────────────────────────────────────────────────────────┘
```

## Validation Points

### 1. Client → Workflow

**Location**: `packages/client/src/client.ts`

```typescript
async executeWorkflow(workflowName, options) {
  const definition = this.contract.workflows[workflowName];
  
  // ✓ Validate input before sending
  const validatedInput = definition.input.parse(options.args);
  
  const result = await this.client.workflow.execute(workflowName, {
    workflowId: options.workflowId,
    taskQueue: definition.taskQueue,
    args: validatedInput, // Sent over network
  });
  
  // ✓ Validate output after receiving
  return definition.output.parse(result);
}
```

### 2. Workflow Input

**Location**: `packages/worker/src/workflow.ts`

```typescript
export function createWorkflow(options) {
  return async (...args: any[]) => {
    // ✓ Validate input received from client
    const validatedInput = definition.input.parse(args);
    
    // ... workflow execution
  };
}
```

### 3. Workflow → Activity

**Location**: `packages/worker/src/workflow.ts`

```typescript
function createValidatedActivities(rawActivities, activitiesDefinition) {
  const validatedActivities = {};

  for (const [activityName, activityDef] of Object.entries(activitiesDefinition)) {
    const rawActivity = rawActivities[activityName];
    
    validatedActivities[activityName] = async (...args: any[]) => {
      // ✓ Validate input BEFORE sending to activity (serialization)
      const validatedInput = activityDef.input.parse(args);
      
      // Call activity (network boundary)
      const result = await rawActivity(...validatedInput);
      
      // ✓ Validate output AFTER receiving from activity (deserialization)
      return activityDef.output.parse(result);
    };
  }

  return validatedActivities;
}
```

### 4. Activity Implementation

**Location**: `packages/worker/src/activity.ts`

```typescript
export function createActivity(options) {
  return async (...args: any[]) => {
    // ✓ Validate input received from workflow
    const validatedInput = definition.input.parse(args);
    
    // Execute activity logic
    const result = await implementation(...validatedInput);
    
    // ✓ Validate output before returning to workflow
    return definition.output.parse(result);
  };
}
```

### 5. Workflow Output

**Location**: `packages/worker/src/workflow.ts`

```typescript
export function createWorkflow(options) {
  return async (...args: any[]) => {
    // ... workflow execution
    
    const result = await implementation(context, ...validatedInput);
    
    // ✓ Validate output before returning to client
    return definition.output.parse(result);
  };
}
```

## Why This Matters

### Network Serialization

Temporal serializes data when:
- Sending workflow inputs from client to server
- Calling activities from workflows (different processes/machines)
- Returning results from activities back to workflows
- Returning workflow results to the client

During serialization/deserialization:
- Type information is lost
- Data can be corrupted
- Unexpected values can appear
- Security vulnerabilities can be introduced

### Protection Provided

`temporal-contract` validates at every boundary:

1. **Type Safety**: Ensures runtime types match compile-time types
2. **Data Integrity**: Catches corrupted or malformed data
3. **Security**: Prevents injection attacks and unexpected inputs
4. **Early Error Detection**: Fails fast with clear error messages
5. **Contract Enforcement**: Guarantees API contracts are respected

### Example Error Scenarios Caught

#### Invalid Input Type
```typescript
// Client sends wrong type
await client.executeWorkflow('processOrder', {
  workflowId: 'order-123',
  args: [123, 'CUST-456', []], // ❌ orderId should be string
});

// Error: Expected string, received number
```

#### Corrupted Network Data
```typescript
// Activity returns corrupted data after network transmission
const inventory = await context.activities.validateInventory(productId, qty);
// If network corruption caused: { available: "yes" } instead of { available: true }
// Error: Expected boolean, received string
```

#### Schema Evolution
```typescript
// Old client sends old format
args: ['ORD-123'] // Missing required customerId

// Error: Expected 2 elements in tuple, received 1
```

## Performance Considerations

### Validation Overhead

Each validation adds minimal overhead:
- **Parsing**: ~0.1-1ms per validation (depends on schema complexity)
- **Network**: Already exists (Temporal's serialization)
- **Safety**: Worth the cost for data integrity

### Optimization Tips

1. **Keep schemas simple**: Complex schemas take longer to validate
2. **Use `.strict()`**: Prevents unknown keys (more secure, slightly faster)
3. **Reuse schemas**: Define common schemas once and reuse them
4. **Profile**: If performance is critical, profile validation time

### When to Skip Validation

In high-throughput scenarios, you might consider:
- Using raw Temporal APIs (without `temporal-contract`)
- Validating only at boundaries (client input, final output)
- Using simpler validation libraries

However, **data integrity should usually take precedence over performance**.

## Best Practices

1. **Always use tuples**: Even for single arguments `z.tuple([z.object({ ... })])`
2. **Validate early**: Catch errors as close to the source as possible
3. **Use strict schemas**: `.strict()` prevents unexpected fields
4. **Add constraints**: Use `.min()`, `.max()`, `.email()`, etc.
5. **Document schemas**: Use `.describe()` for better error messages
6. **Test validation**: Write tests for invalid inputs
7. **Monitor errors**: Log validation failures for debugging

## Summary

`temporal-contract` provides **defense in depth** by validating at every network boundary:

| Boundary | Direction | Validation Point | Purpose |
|----------|-----------|------------------|---------|
| Client → Workflow | Input | Client-side | Catch client errors early |
| Client → Workflow | Input | Workflow-side | Protect against network corruption |
| Workflow → Activity | Input | Workflow-side | Validate before serialization |
| Activity → Workflow | Output | Workflow-side | Validate after deserialization |
| Activity | Input | Activity-side | Protect activity implementation |
| Activity | Output | Activity-side | Ensure correct return values |
| Workflow → Client | Output | Workflow-side | Final validation before return |
| Workflow → Client | Output | Client-side | Type-safe result for consumer |

This comprehensive validation ensures **end-to-end type safety and data integrity** across your entire Temporal application.
