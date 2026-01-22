**@temporal-contract/client**

---

# @temporal-contract/client

## Classes

### QueryValidationError

Defined in: [packages/client/src/errors.ts:64](https://github.com/btravers/temporal-contract/blob/5120f893a4e07cf022d0192f94ff01e2d170fcf9/packages/client/src/errors.ts#L64)

Thrown when query input or output validation fails

#### Extends

- `TypedClientError`

#### Constructors

##### Constructor

```ts
new QueryValidationError(
   queryName,
   direction,
   issues): QueryValidationError;
```

Defined in: [packages/client/src/errors.ts:65](https://github.com/btravers/temporal-contract/blob/5120f893a4e07cf022d0192f94ff01e2d170fcf9/packages/client/src/errors.ts#L65)

###### Parameters

| Parameter   | Type                    |
| ----------- | ----------------------- |
| `queryName` | `string`                |
| `direction` | `"output"` \| `"input"` |
| `issues`    | readonly `Issue`[]      |

###### Returns

[`QueryValidationError`](#queryvalidationerror)

###### Overrides

```ts
TypedClientError.constructor;
```

#### Properties

| Property                                       | Modifier   | Type                    | Description                                                                                                                                                                                                                                                                                                                                                                                                                                       | Inherited from                     | Defined in                                                                                                                                                        |
| ---------------------------------------------- | ---------- | ----------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| <a id="cause"></a> `cause?`                    | `public`   | `unknown`               | -                                                                                                                                                                                                                                                                                                                                                                                                                                                 | `TypedClientError.cause`           | node_modules/.pnpm/typescript@5.9.3/node_modules/typescript/lib/lib.es2022.error.d.ts:26                                                                          |
| <a id="direction"></a> `direction`             | `readonly` | `"output"` \| `"input"` | -                                                                                                                                                                                                                                                                                                                                                                                                                                                 | -                                  | [packages/client/src/errors.ts:67](https://github.com/btravers/temporal-contract/blob/5120f893a4e07cf022d0192f94ff01e2d170fcf9/packages/client/src/errors.ts#L67) |
| <a id="issues"></a> `issues`                   | `readonly` | readonly `Issue`[]      | -                                                                                                                                                                                                                                                                                                                                                                                                                                                 | -                                  | [packages/client/src/errors.ts:68](https://github.com/btravers/temporal-contract/blob/5120f893a4e07cf022d0192f94ff01e2d170fcf9/packages/client/src/errors.ts#L68) |
| <a id="message"></a> `message`                 | `public`   | `string`                | -                                                                                                                                                                                                                                                                                                                                                                                                                                                 | `TypedClientError.message`         | node_modules/.pnpm/typescript@5.9.3/node_modules/typescript/lib/lib.es5.d.ts:1077                                                                                 |
| <a id="name"></a> `name`                       | `public`   | `string`                | -                                                                                                                                                                                                                                                                                                                                                                                                                                                 | `TypedClientError.name`            | node_modules/.pnpm/typescript@5.9.3/node_modules/typescript/lib/lib.es5.d.ts:1076                                                                                 |
| <a id="queryname"></a> `queryName`             | `readonly` | `string`                | -                                                                                                                                                                                                                                                                                                                                                                                                                                                 | -                                  | [packages/client/src/errors.ts:66](https://github.com/btravers/temporal-contract/blob/5120f893a4e07cf022d0192f94ff01e2d170fcf9/packages/client/src/errors.ts#L66) |
| <a id="stack"></a> `stack?`                    | `public`   | `string`                | -                                                                                                                                                                                                                                                                                                                                                                                                                                                 | `TypedClientError.stack`           | node_modules/.pnpm/typescript@5.9.3/node_modules/typescript/lib/lib.es5.d.ts:1078                                                                                 |
| <a id="stacktracelimit"></a> `stackTraceLimit` | `static`   | `number`                | The `Error.stackTraceLimit` property specifies the number of stack frames collected by a stack trace (whether generated by `new Error().stack` or `Error.captureStackTrace(obj)`). The default value is `10` but may be set to any valid JavaScript number. Changes will affect any stack trace captured _after_ the value has been changed. If set to a non-number value, or set to a negative number, stack traces will not capture any frames. | `TypedClientError.stackTraceLimit` | node_modules/.pnpm/@types+node@25.0.9/node_modules/@types/node/globals.d.ts:67                                                                                    |

#### Methods

##### captureStackTrace()

```ts
static captureStackTrace(targetObject, constructorOpt?): void;
```

Defined in: node_modules/.pnpm/@types+node@25.0.9/node_modules/@types/node/globals.d.ts:51

Creates a `.stack` property on `targetObject`, which when accessed returns
a string representing the location in the code at which
`Error.captureStackTrace()` was called.

```js
const myObject = {};
Error.captureStackTrace(myObject);
myObject.stack; // Similar to `new Error().stack`
```

The first line of the trace will be prefixed with
`${myObject.name}: ${myObject.message}`.

The optional `constructorOpt` argument accepts a function. If given, all frames
above `constructorOpt`, including `constructorOpt`, will be omitted from the
generated stack trace.

The `constructorOpt` argument is useful for hiding implementation
details of error generation from the user. For instance:

```js
function a() {
  b();
}

function b() {
  c();
}

function c() {
  // Create an error without stack trace to avoid calculating the stack trace twice.
  const { stackTraceLimit } = Error;
  Error.stackTraceLimit = 0;
  const error = new Error();
  Error.stackTraceLimit = stackTraceLimit;

  // Capture the stack trace above function b
  Error.captureStackTrace(error, b); // Neither function c, nor b is included in the stack trace
  throw error;
}

a();
```

###### Parameters

| Parameter         | Type       |
| ----------------- | ---------- |
| `targetObject`    | `object`   |
| `constructorOpt?` | `Function` |

###### Returns

`void`

###### Inherited from

```ts
TypedClientError.captureStackTrace;
```

##### prepareStackTrace()

```ts
static prepareStackTrace(err, stackTraces): any;
```

Defined in: node_modules/.pnpm/@types+node@25.0.9/node_modules/@types/node/globals.d.ts:55

###### Parameters

| Parameter     | Type         |
| ------------- | ------------ |
| `err`         | `Error`      |
| `stackTraces` | `CallSite`[] |

###### Returns

`any`

###### See

https://v8.dev/docs/stack-trace-api#customizing-stack-traces

###### Inherited from

```ts
TypedClientError.prepareStackTrace;
```

---

### SignalValidationError

Defined in: [packages/client/src/errors.ts:77](https://github.com/btravers/temporal-contract/blob/5120f893a4e07cf022d0192f94ff01e2d170fcf9/packages/client/src/errors.ts#L77)

Thrown when signal input validation fails

#### Extends

- `TypedClientError`

#### Constructors

##### Constructor

```ts
new SignalValidationError(signalName, issues): SignalValidationError;
```

Defined in: [packages/client/src/errors.ts:78](https://github.com/btravers/temporal-contract/blob/5120f893a4e07cf022d0192f94ff01e2d170fcf9/packages/client/src/errors.ts#L78)

###### Parameters

| Parameter    | Type               |
| ------------ | ------------------ |
| `signalName` | `string`           |
| `issues`     | readonly `Issue`[] |

###### Returns

[`SignalValidationError`](#signalvalidationerror)

###### Overrides

```ts
TypedClientError.constructor;
```

#### Properties

| Property                                         | Modifier   | Type               | Description                                                                                                                                                                                                                                                                                                                                                                                                                                       | Inherited from                     | Defined in                                                                                                                                                        |
| ------------------------------------------------ | ---------- | ------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| <a id="cause-1"></a> `cause?`                    | `public`   | `unknown`          | -                                                                                                                                                                                                                                                                                                                                                                                                                                                 | `TypedClientError.cause`           | node_modules/.pnpm/typescript@5.9.3/node_modules/typescript/lib/lib.es2022.error.d.ts:26                                                                          |
| <a id="issues-1"></a> `issues`                   | `readonly` | readonly `Issue`[] | -                                                                                                                                                                                                                                                                                                                                                                                                                                                 | -                                  | [packages/client/src/errors.ts:80](https://github.com/btravers/temporal-contract/blob/5120f893a4e07cf022d0192f94ff01e2d170fcf9/packages/client/src/errors.ts#L80) |
| <a id="message-1"></a> `message`                 | `public`   | `string`           | -                                                                                                                                                                                                                                                                                                                                                                                                                                                 | `TypedClientError.message`         | node_modules/.pnpm/typescript@5.9.3/node_modules/typescript/lib/lib.es5.d.ts:1077                                                                                 |
| <a id="name-1"></a> `name`                       | `public`   | `string`           | -                                                                                                                                                                                                                                                                                                                                                                                                                                                 | `TypedClientError.name`            | node_modules/.pnpm/typescript@5.9.3/node_modules/typescript/lib/lib.es5.d.ts:1076                                                                                 |
| <a id="signalname"></a> `signalName`             | `readonly` | `string`           | -                                                                                                                                                                                                                                                                                                                                                                                                                                                 | -                                  | [packages/client/src/errors.ts:79](https://github.com/btravers/temporal-contract/blob/5120f893a4e07cf022d0192f94ff01e2d170fcf9/packages/client/src/errors.ts#L79) |
| <a id="stack-1"></a> `stack?`                    | `public`   | `string`           | -                                                                                                                                                                                                                                                                                                                                                                                                                                                 | `TypedClientError.stack`           | node_modules/.pnpm/typescript@5.9.3/node_modules/typescript/lib/lib.es5.d.ts:1078                                                                                 |
| <a id="stacktracelimit-1"></a> `stackTraceLimit` | `static`   | `number`           | The `Error.stackTraceLimit` property specifies the number of stack frames collected by a stack trace (whether generated by `new Error().stack` or `Error.captureStackTrace(obj)`). The default value is `10` but may be set to any valid JavaScript number. Changes will affect any stack trace captured _after_ the value has been changed. If set to a non-number value, or set to a negative number, stack traces will not capture any frames. | `TypedClientError.stackTraceLimit` | node_modules/.pnpm/@types+node@25.0.9/node_modules/@types/node/globals.d.ts:67                                                                                    |

#### Methods

##### captureStackTrace()

```ts
static captureStackTrace(targetObject, constructorOpt?): void;
```

Defined in: node_modules/.pnpm/@types+node@25.0.9/node_modules/@types/node/globals.d.ts:51

Creates a `.stack` property on `targetObject`, which when accessed returns
a string representing the location in the code at which
`Error.captureStackTrace()` was called.

```js
const myObject = {};
Error.captureStackTrace(myObject);
myObject.stack; // Similar to `new Error().stack`
```

The first line of the trace will be prefixed with
`${myObject.name}: ${myObject.message}`.

The optional `constructorOpt` argument accepts a function. If given, all frames
above `constructorOpt`, including `constructorOpt`, will be omitted from the
generated stack trace.

The `constructorOpt` argument is useful for hiding implementation
details of error generation from the user. For instance:

```js
function a() {
  b();
}

function b() {
  c();
}

function c() {
  // Create an error without stack trace to avoid calculating the stack trace twice.
  const { stackTraceLimit } = Error;
  Error.stackTraceLimit = 0;
  const error = new Error();
  Error.stackTraceLimit = stackTraceLimit;

  // Capture the stack trace above function b
  Error.captureStackTrace(error, b); // Neither function c, nor b is included in the stack trace
  throw error;
}

a();
```

###### Parameters

| Parameter         | Type       |
| ----------------- | ---------- |
| `targetObject`    | `object`   |
| `constructorOpt?` | `Function` |

###### Returns

`void`

###### Inherited from

```ts
TypedClientError.captureStackTrace;
```

##### prepareStackTrace()

```ts
static prepareStackTrace(err, stackTraces): any;
```

Defined in: node_modules/.pnpm/@types+node@25.0.9/node_modules/@types/node/globals.d.ts:55

###### Parameters

| Parameter     | Type         |
| ------------- | ------------ |
| `err`         | `Error`      |
| `stackTraces` | `CallSite`[] |

###### Returns

`any`

###### See

https://v8.dev/docs/stack-trace-api#customizing-stack-traces

###### Inherited from

```ts
TypedClientError.prepareStackTrace;
```

---

### TypedClient&lt;TContract&gt;

Defined in: [packages/client/src/client.ts:115](https://github.com/btravers/temporal-contract/blob/5120f893a4e07cf022d0192f94ff01e2d170fcf9/packages/client/src/client.ts#L115)

Typed Temporal client with Result/Future pattern based on a contract

Provides type-safe methods to start and execute workflows
defined in the contract, with explicit error handling using Result pattern.

#### Type Parameters

| Type Parameter                             |
| ------------------------------------------ |
| `TContract` _extends_ `ContractDefinition` |

#### Methods

##### executeWorkflow()

```ts
executeWorkflow<TWorkflowName>(workflowName, __namedParameters): Future<Result<ClientInferOutput<TContract["workflows"][TWorkflowName]>,
  | WorkflowNotFoundError
  | WorkflowValidationError
  | RuntimeClientError>>;
```

Defined in: [packages/client/src/client.ts:237](https://github.com/btravers/temporal-contract/blob/5120f893a4e07cf022d0192f94ff01e2d170fcf9/packages/client/src/client.ts#L237)

Execute a workflow (start and wait for result) with Future/Result pattern

###### Type Parameters

| Type Parameter                                             |
| ---------------------------------------------------------- |
| `TWorkflowName` _extends_ `string` \| `number` \| `symbol` |

###### Parameters

| Parameter           | Type                                                                                          |
| ------------------- | --------------------------------------------------------------------------------------------- |
| `workflowName`      | `TWorkflowName`                                                                               |
| `__namedParameters` | [`TypedWorkflowStartOptions`](#typedworkflowstartoptions)&lt;`TContract`, `TWorkflowName`&gt; |

###### Returns

`Future`&lt;`Result`&lt;[`ClientInferOutput`](#clientinferoutput)&lt;`TContract`\[`"workflows"`\]\[`TWorkflowName`\]&gt;,
\| [`WorkflowNotFoundError`](#workflownotfounderror)
\| [`WorkflowValidationError`](#workflowvalidationerror)
\| `RuntimeClientError`&gt;&gt;

###### Example

```ts
const result = await client.executeWorkflow("processOrder", {
  workflowId: "order-123",
  args: { orderId: "ORD-123" },
  workflowExecutionTimeout: "1 day",
  retry: { maximumAttempts: 3 },
});

result.match({
  Ok: (output) => console.log("Order processed:", output.status),
  Error: (error) => console.error("Processing failed:", error),
});
```

##### getHandle()

```ts
getHandle<TWorkflowName>(workflowName, workflowId): Future<Result<TypedWorkflowHandle<TContract["workflows"][TWorkflowName]>, WorkflowNotFoundError | RuntimeClientError>>;
```

Defined in: [packages/client/src/client.ts:313](https://github.com/btravers/temporal-contract/blob/5120f893a4e07cf022d0192f94ff01e2d170fcf9/packages/client/src/client.ts#L313)

Get a handle to an existing workflow with Future/Result pattern

###### Type Parameters

| Type Parameter                                             |
| ---------------------------------------------------------- |
| `TWorkflowName` _extends_ `string` \| `number` \| `symbol` |

###### Parameters

| Parameter      | Type            |
| -------------- | --------------- |
| `workflowName` | `TWorkflowName` |
| `workflowId`   | `string`        |

###### Returns

`Future`&lt;`Result`&lt;[`TypedWorkflowHandle`](#typedworkflowhandle)&lt;`TContract`\[`"workflows"`\]\[`TWorkflowName`\]&gt;, [`WorkflowNotFoundError`](#workflownotfounderror) \| `RuntimeClientError`&gt;&gt;

###### Example

```ts
const handleResult = await client.getHandle("processOrder", "order-123");
handleResult.match({
  Ok: async (handle) => {
    const result = await handle.result();
    // ... handle result
  },
  Error: (error) => console.error("Failed to get handle:", error),
});
```

##### startWorkflow()

```ts
startWorkflow<TWorkflowName>(workflowName, __namedParameters): Future<Result<TypedWorkflowHandle<TContract["workflows"][TWorkflowName]>,
  | WorkflowNotFoundError
  | WorkflowValidationError
  | RuntimeClientError>>;
```

Defined in: [packages/client/src/client.ts:171](https://github.com/btravers/temporal-contract/blob/5120f893a4e07cf022d0192f94ff01e2d170fcf9/packages/client/src/client.ts#L171)

Start a workflow and return a typed handle with Future pattern

###### Type Parameters

| Type Parameter                                             |
| ---------------------------------------------------------- |
| `TWorkflowName` _extends_ `string` \| `number` \| `symbol` |

###### Parameters

| Parameter           | Type                                                                                          |
| ------------------- | --------------------------------------------------------------------------------------------- |
| `workflowName`      | `TWorkflowName`                                                                               |
| `__namedParameters` | [`TypedWorkflowStartOptions`](#typedworkflowstartoptions)&lt;`TContract`, `TWorkflowName`&gt; |

###### Returns

`Future`&lt;`Result`&lt;[`TypedWorkflowHandle`](#typedworkflowhandle)&lt;`TContract`\[`"workflows"`\]\[`TWorkflowName`\]&gt;,
\| [`WorkflowNotFoundError`](#workflownotfounderror)
\| [`WorkflowValidationError`](#workflowvalidationerror)
\| `RuntimeClientError`&gt;&gt;

###### Example

```ts
const handleResult = await client.startWorkflow("processOrder", {
  workflowId: "order-123",
  args: { orderId: "ORD-123" },
  workflowExecutionTimeout: "1 day",
  retry: { maximumAttempts: 3 },
});

handleResult.match({
  Ok: async (handle) => {
    const result = await handle.result();
    // ... handle result
  },
  Error: (error) => console.error("Failed to start:", error),
});
```

##### create()

```ts
static create<TContract>(contract, client): TypedClient<TContract>;
```

Defined in: [packages/client/src/client.ts:143](https://github.com/btravers/temporal-contract/blob/5120f893a4e07cf022d0192f94ff01e2d170fcf9/packages/client/src/client.ts#L143)

Create a typed Temporal client with boxed pattern from a contract

###### Type Parameters

| Type Parameter                                                                                                                                                                                                                                                                                                                                                                                                                                                                                     |
| -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `TContract` _extends_ `ContractDefinition`&lt;`Record`&lt;`string`, `WorkflowDefinition`&lt;`Record`&lt;`string`, `ActivityDefinition`&lt;`AnySchema`, `AnySchema`&gt;&gt;, `Record`&lt;`string`, `SignalDefinition`&lt;`AnySchema`&gt;&gt;, `Record`&lt;`string`, `QueryDefinition`&lt;`AnySchema`, `AnySchema`&gt;&gt;, `Record`&lt;`string`, `UpdateDefinition`&lt;`AnySchema`, `AnySchema`&gt;&gt;&gt;&gt;, `Record`&lt;`string`, `ActivityDefinition`&lt;`AnySchema`, `AnySchema`&gt;&gt;&gt; |

###### Parameters

| Parameter  | Type        |
| ---------- | ----------- |
| `contract` | `TContract` |
| `client`   | `Client`    |

###### Returns

[`TypedClient`](#typedclient)&lt;`TContract`&gt;

###### Example

```ts
const connection = await Connection.connect();
const client = TypedClient.create(myContract, {
  connection,
  namespace: 'default',
});

const result = await client.executeWorkflow('processOrder', {
  workflowId: 'order-123',
  args: { ... },
});

result.match({
  Ok: (output) => console.log('Success:', output),
  Error: (error) => console.error('Failed:', error),
});
```

---

### UpdateValidationError

Defined in: [packages/client/src/errors.ts:89](https://github.com/btravers/temporal-contract/blob/5120f893a4e07cf022d0192f94ff01e2d170fcf9/packages/client/src/errors.ts#L89)

Thrown when update input or output validation fails

#### Extends

- `TypedClientError`

#### Constructors

##### Constructor

```ts
new UpdateValidationError(
   updateName,
   direction,
   issues): UpdateValidationError;
```

Defined in: [packages/client/src/errors.ts:90](https://github.com/btravers/temporal-contract/blob/5120f893a4e07cf022d0192f94ff01e2d170fcf9/packages/client/src/errors.ts#L90)

###### Parameters

| Parameter    | Type                    |
| ------------ | ----------------------- |
| `updateName` | `string`                |
| `direction`  | `"output"` \| `"input"` |
| `issues`     | readonly `Issue`[]      |

###### Returns

[`UpdateValidationError`](#updatevalidationerror)

###### Overrides

```ts
TypedClientError.constructor;
```

#### Properties

| Property                                         | Modifier   | Type                    | Description                                                                                                                                                                                                                                                                                                                                                                                                                                       | Inherited from                     | Defined in                                                                                                                                                        |
| ------------------------------------------------ | ---------- | ----------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| <a id="cause-2"></a> `cause?`                    | `public`   | `unknown`               | -                                                                                                                                                                                                                                                                                                                                                                                                                                                 | `TypedClientError.cause`           | node_modules/.pnpm/typescript@5.9.3/node_modules/typescript/lib/lib.es2022.error.d.ts:26                                                                          |
| <a id="direction-1"></a> `direction`             | `readonly` | `"output"` \| `"input"` | -                                                                                                                                                                                                                                                                                                                                                                                                                                                 | -                                  | [packages/client/src/errors.ts:92](https://github.com/btravers/temporal-contract/blob/5120f893a4e07cf022d0192f94ff01e2d170fcf9/packages/client/src/errors.ts#L92) |
| <a id="issues-2"></a> `issues`                   | `readonly` | readonly `Issue`[]      | -                                                                                                                                                                                                                                                                                                                                                                                                                                                 | -                                  | [packages/client/src/errors.ts:93](https://github.com/btravers/temporal-contract/blob/5120f893a4e07cf022d0192f94ff01e2d170fcf9/packages/client/src/errors.ts#L93) |
| <a id="message-2"></a> `message`                 | `public`   | `string`                | -                                                                                                                                                                                                                                                                                                                                                                                                                                                 | `TypedClientError.message`         | node_modules/.pnpm/typescript@5.9.3/node_modules/typescript/lib/lib.es5.d.ts:1077                                                                                 |
| <a id="name-2"></a> `name`                       | `public`   | `string`                | -                                                                                                                                                                                                                                                                                                                                                                                                                                                 | `TypedClientError.name`            | node_modules/.pnpm/typescript@5.9.3/node_modules/typescript/lib/lib.es5.d.ts:1076                                                                                 |
| <a id="stack-2"></a> `stack?`                    | `public`   | `string`                | -                                                                                                                                                                                                                                                                                                                                                                                                                                                 | `TypedClientError.stack`           | node_modules/.pnpm/typescript@5.9.3/node_modules/typescript/lib/lib.es5.d.ts:1078                                                                                 |
| <a id="updatename"></a> `updateName`             | `readonly` | `string`                | -                                                                                                                                                                                                                                                                                                                                                                                                                                                 | -                                  | [packages/client/src/errors.ts:91](https://github.com/btravers/temporal-contract/blob/5120f893a4e07cf022d0192f94ff01e2d170fcf9/packages/client/src/errors.ts#L91) |
| <a id="stacktracelimit-2"></a> `stackTraceLimit` | `static`   | `number`                | The `Error.stackTraceLimit` property specifies the number of stack frames collected by a stack trace (whether generated by `new Error().stack` or `Error.captureStackTrace(obj)`). The default value is `10` but may be set to any valid JavaScript number. Changes will affect any stack trace captured _after_ the value has been changed. If set to a non-number value, or set to a negative number, stack traces will not capture any frames. | `TypedClientError.stackTraceLimit` | node_modules/.pnpm/@types+node@25.0.9/node_modules/@types/node/globals.d.ts:67                                                                                    |

#### Methods

##### captureStackTrace()

```ts
static captureStackTrace(targetObject, constructorOpt?): void;
```

Defined in: node_modules/.pnpm/@types+node@25.0.9/node_modules/@types/node/globals.d.ts:51

Creates a `.stack` property on `targetObject`, which when accessed returns
a string representing the location in the code at which
`Error.captureStackTrace()` was called.

```js
const myObject = {};
Error.captureStackTrace(myObject);
myObject.stack; // Similar to `new Error().stack`
```

The first line of the trace will be prefixed with
`${myObject.name}: ${myObject.message}`.

The optional `constructorOpt` argument accepts a function. If given, all frames
above `constructorOpt`, including `constructorOpt`, will be omitted from the
generated stack trace.

The `constructorOpt` argument is useful for hiding implementation
details of error generation from the user. For instance:

```js
function a() {
  b();
}

function b() {
  c();
}

function c() {
  // Create an error without stack trace to avoid calculating the stack trace twice.
  const { stackTraceLimit } = Error;
  Error.stackTraceLimit = 0;
  const error = new Error();
  Error.stackTraceLimit = stackTraceLimit;

  // Capture the stack trace above function b
  Error.captureStackTrace(error, b); // Neither function c, nor b is included in the stack trace
  throw error;
}

a();
```

###### Parameters

| Parameter         | Type       |
| ----------------- | ---------- |
| `targetObject`    | `object`   |
| `constructorOpt?` | `Function` |

###### Returns

`void`

###### Inherited from

```ts
TypedClientError.captureStackTrace;
```

##### prepareStackTrace()

```ts
static prepareStackTrace(err, stackTraces): any;
```

Defined in: node_modules/.pnpm/@types+node@25.0.9/node_modules/@types/node/globals.d.ts:55

###### Parameters

| Parameter     | Type         |
| ------------- | ------------ |
| `err`         | `Error`      |
| `stackTraces` | `CallSite`[] |

###### Returns

`any`

###### See

https://v8.dev/docs/stack-trace-api#customizing-stack-traces

###### Inherited from

```ts
TypedClientError.prepareStackTrace;
```

---

### WorkflowNotFoundError

Defined in: [packages/client/src/errors.ts:35](https://github.com/btravers/temporal-contract/blob/5120f893a4e07cf022d0192f94ff01e2d170fcf9/packages/client/src/errors.ts#L35)

Thrown when a workflow is not found in the contract

#### Extends

- `TypedClientError`

#### Constructors

##### Constructor

```ts
new WorkflowNotFoundError(workflowName, availableWorkflows): WorkflowNotFoundError;
```

Defined in: [packages/client/src/errors.ts:36](https://github.com/btravers/temporal-contract/blob/5120f893a4e07cf022d0192f94ff01e2d170fcf9/packages/client/src/errors.ts#L36)

###### Parameters

| Parameter            | Type       |
| -------------------- | ---------- |
| `workflowName`       | `string`   |
| `availableWorkflows` | `string`[] |

###### Returns

[`WorkflowNotFoundError`](#workflownotfounderror)

###### Overrides

```ts
TypedClientError.constructor;
```

#### Properties

| Property                                             | Modifier   | Type       | Description                                                                                                                                                                                                                                                                                                                                                                                                                                       | Inherited from                     | Defined in                                                                                                                                                        |
| ---------------------------------------------------- | ---------- | ---------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| <a id="availableworkflows"></a> `availableWorkflows` | `readonly` | `string`[] | -                                                                                                                                                                                                                                                                                                                                                                                                                                                 | -                                  | [packages/client/src/errors.ts:38](https://github.com/btravers/temporal-contract/blob/5120f893a4e07cf022d0192f94ff01e2d170fcf9/packages/client/src/errors.ts#L38) |
| <a id="cause-3"></a> `cause?`                        | `public`   | `unknown`  | -                                                                                                                                                                                                                                                                                                                                                                                                                                                 | `TypedClientError.cause`           | node_modules/.pnpm/typescript@5.9.3/node_modules/typescript/lib/lib.es2022.error.d.ts:26                                                                          |
| <a id="message-3"></a> `message`                     | `public`   | `string`   | -                                                                                                                                                                                                                                                                                                                                                                                                                                                 | `TypedClientError.message`         | node_modules/.pnpm/typescript@5.9.3/node_modules/typescript/lib/lib.es5.d.ts:1077                                                                                 |
| <a id="name-3"></a> `name`                           | `public`   | `string`   | -                                                                                                                                                                                                                                                                                                                                                                                                                                                 | `TypedClientError.name`            | node_modules/.pnpm/typescript@5.9.3/node_modules/typescript/lib/lib.es5.d.ts:1076                                                                                 |
| <a id="stack-3"></a> `stack?`                        | `public`   | `string`   | -                                                                                                                                                                                                                                                                                                                                                                                                                                                 | `TypedClientError.stack`           | node_modules/.pnpm/typescript@5.9.3/node_modules/typescript/lib/lib.es5.d.ts:1078                                                                                 |
| <a id="workflowname"></a> `workflowName`             | `readonly` | `string`   | -                                                                                                                                                                                                                                                                                                                                                                                                                                                 | -                                  | [packages/client/src/errors.ts:37](https://github.com/btravers/temporal-contract/blob/5120f893a4e07cf022d0192f94ff01e2d170fcf9/packages/client/src/errors.ts#L37) |
| <a id="stacktracelimit-3"></a> `stackTraceLimit`     | `static`   | `number`   | The `Error.stackTraceLimit` property specifies the number of stack frames collected by a stack trace (whether generated by `new Error().stack` or `Error.captureStackTrace(obj)`). The default value is `10` but may be set to any valid JavaScript number. Changes will affect any stack trace captured _after_ the value has been changed. If set to a non-number value, or set to a negative number, stack traces will not capture any frames. | `TypedClientError.stackTraceLimit` | node_modules/.pnpm/@types+node@25.0.9/node_modules/@types/node/globals.d.ts:67                                                                                    |

#### Methods

##### captureStackTrace()

```ts
static captureStackTrace(targetObject, constructorOpt?): void;
```

Defined in: node_modules/.pnpm/@types+node@25.0.9/node_modules/@types/node/globals.d.ts:51

Creates a `.stack` property on `targetObject`, which when accessed returns
a string representing the location in the code at which
`Error.captureStackTrace()` was called.

```js
const myObject = {};
Error.captureStackTrace(myObject);
myObject.stack; // Similar to `new Error().stack`
```

The first line of the trace will be prefixed with
`${myObject.name}: ${myObject.message}`.

The optional `constructorOpt` argument accepts a function. If given, all frames
above `constructorOpt`, including `constructorOpt`, will be omitted from the
generated stack trace.

The `constructorOpt` argument is useful for hiding implementation
details of error generation from the user. For instance:

```js
function a() {
  b();
}

function b() {
  c();
}

function c() {
  // Create an error without stack trace to avoid calculating the stack trace twice.
  const { stackTraceLimit } = Error;
  Error.stackTraceLimit = 0;
  const error = new Error();
  Error.stackTraceLimit = stackTraceLimit;

  // Capture the stack trace above function b
  Error.captureStackTrace(error, b); // Neither function c, nor b is included in the stack trace
  throw error;
}

a();
```

###### Parameters

| Parameter         | Type       |
| ----------------- | ---------- |
| `targetObject`    | `object`   |
| `constructorOpt?` | `Function` |

###### Returns

`void`

###### Inherited from

```ts
TypedClientError.captureStackTrace;
```

##### prepareStackTrace()

```ts
static prepareStackTrace(err, stackTraces): any;
```

Defined in: node_modules/.pnpm/@types+node@25.0.9/node_modules/@types/node/globals.d.ts:55

###### Parameters

| Parameter     | Type         |
| ------------- | ------------ |
| `err`         | `Error`      |
| `stackTraces` | `CallSite`[] |

###### Returns

`any`

###### See

https://v8.dev/docs/stack-trace-api#customizing-stack-traces

###### Inherited from

```ts
TypedClientError.prepareStackTrace;
```

---

### WorkflowValidationError

Defined in: [packages/client/src/errors.ts:49](https://github.com/btravers/temporal-contract/blob/5120f893a4e07cf022d0192f94ff01e2d170fcf9/packages/client/src/errors.ts#L49)

Thrown when workflow input or output validation fails

#### Extends

- `TypedClientError`

#### Constructors

##### Constructor

```ts
new WorkflowValidationError(
   workflowName,
   direction,
   issues): WorkflowValidationError;
```

Defined in: [packages/client/src/errors.ts:50](https://github.com/btravers/temporal-contract/blob/5120f893a4e07cf022d0192f94ff01e2d170fcf9/packages/client/src/errors.ts#L50)

###### Parameters

| Parameter      | Type                    |
| -------------- | ----------------------- |
| `workflowName` | `string`                |
| `direction`    | `"output"` \| `"input"` |
| `issues`       | readonly `Issue`[]      |

###### Returns

[`WorkflowValidationError`](#workflowvalidationerror)

###### Overrides

```ts
TypedClientError.constructor;
```

#### Properties

| Property                                         | Modifier   | Type                    | Description                                                                                                                                                                                                                                                                                                                                                                                                                                       | Inherited from                     | Defined in                                                                                                                                                        |
| ------------------------------------------------ | ---------- | ----------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| <a id="cause-4"></a> `cause?`                    | `public`   | `unknown`               | -                                                                                                                                                                                                                                                                                                                                                                                                                                                 | `TypedClientError.cause`           | node_modules/.pnpm/typescript@5.9.3/node_modules/typescript/lib/lib.es2022.error.d.ts:26                                                                          |
| <a id="direction-2"></a> `direction`             | `readonly` | `"output"` \| `"input"` | -                                                                                                                                                                                                                                                                                                                                                                                                                                                 | -                                  | [packages/client/src/errors.ts:52](https://github.com/btravers/temporal-contract/blob/5120f893a4e07cf022d0192f94ff01e2d170fcf9/packages/client/src/errors.ts#L52) |
| <a id="issues-3"></a> `issues`                   | `readonly` | readonly `Issue`[]      | -                                                                                                                                                                                                                                                                                                                                                                                                                                                 | -                                  | [packages/client/src/errors.ts:53](https://github.com/btravers/temporal-contract/blob/5120f893a4e07cf022d0192f94ff01e2d170fcf9/packages/client/src/errors.ts#L53) |
| <a id="message-4"></a> `message`                 | `public`   | `string`                | -                                                                                                                                                                                                                                                                                                                                                                                                                                                 | `TypedClientError.message`         | node_modules/.pnpm/typescript@5.9.3/node_modules/typescript/lib/lib.es5.d.ts:1077                                                                                 |
| <a id="name-4"></a> `name`                       | `public`   | `string`                | -                                                                                                                                                                                                                                                                                                                                                                                                                                                 | `TypedClientError.name`            | node_modules/.pnpm/typescript@5.9.3/node_modules/typescript/lib/lib.es5.d.ts:1076                                                                                 |
| <a id="stack-4"></a> `stack?`                    | `public`   | `string`                | -                                                                                                                                                                                                                                                                                                                                                                                                                                                 | `TypedClientError.stack`           | node_modules/.pnpm/typescript@5.9.3/node_modules/typescript/lib/lib.es5.d.ts:1078                                                                                 |
| <a id="workflowname-1"></a> `workflowName`       | `readonly` | `string`                | -                                                                                                                                                                                                                                                                                                                                                                                                                                                 | -                                  | [packages/client/src/errors.ts:51](https://github.com/btravers/temporal-contract/blob/5120f893a4e07cf022d0192f94ff01e2d170fcf9/packages/client/src/errors.ts#L51) |
| <a id="stacktracelimit-4"></a> `stackTraceLimit` | `static`   | `number`                | The `Error.stackTraceLimit` property specifies the number of stack frames collected by a stack trace (whether generated by `new Error().stack` or `Error.captureStackTrace(obj)`). The default value is `10` but may be set to any valid JavaScript number. Changes will affect any stack trace captured _after_ the value has been changed. If set to a non-number value, or set to a negative number, stack traces will not capture any frames. | `TypedClientError.stackTraceLimit` | node_modules/.pnpm/@types+node@25.0.9/node_modules/@types/node/globals.d.ts:67                                                                                    |

#### Methods

##### captureStackTrace()

```ts
static captureStackTrace(targetObject, constructorOpt?): void;
```

Defined in: node_modules/.pnpm/@types+node@25.0.9/node_modules/@types/node/globals.d.ts:51

Creates a `.stack` property on `targetObject`, which when accessed returns
a string representing the location in the code at which
`Error.captureStackTrace()` was called.

```js
const myObject = {};
Error.captureStackTrace(myObject);
myObject.stack; // Similar to `new Error().stack`
```

The first line of the trace will be prefixed with
`${myObject.name}: ${myObject.message}`.

The optional `constructorOpt` argument accepts a function. If given, all frames
above `constructorOpt`, including `constructorOpt`, will be omitted from the
generated stack trace.

The `constructorOpt` argument is useful for hiding implementation
details of error generation from the user. For instance:

```js
function a() {
  b();
}

function b() {
  c();
}

function c() {
  // Create an error without stack trace to avoid calculating the stack trace twice.
  const { stackTraceLimit } = Error;
  Error.stackTraceLimit = 0;
  const error = new Error();
  Error.stackTraceLimit = stackTraceLimit;

  // Capture the stack trace above function b
  Error.captureStackTrace(error, b); // Neither function c, nor b is included in the stack trace
  throw error;
}

a();
```

###### Parameters

| Parameter         | Type       |
| ----------------- | ---------- |
| `targetObject`    | `object`   |
| `constructorOpt?` | `Function` |

###### Returns

`void`

###### Inherited from

```ts
TypedClientError.captureStackTrace;
```

##### prepareStackTrace()

```ts
static prepareStackTrace(err, stackTraces): any;
```

Defined in: node_modules/.pnpm/@types+node@25.0.9/node_modules/@types/node/globals.d.ts:55

###### Parameters

| Parameter     | Type         |
| ------------- | ------------ |
| `err`         | `Error`      |
| `stackTraces` | `CallSite`[] |

###### Returns

`any`

###### See

https://v8.dev/docs/stack-trace-api#customizing-stack-traces

###### Inherited from

```ts
TypedClientError.prepareStackTrace;
```

## Interfaces

### TypedWorkflowHandle&lt;TWorkflow&gt;

Defined in: [packages/client/src/client.ts:38](https://github.com/btravers/temporal-contract/blob/5120f893a4e07cf022d0192f94ff01e2d170fcf9/packages/client/src/client.ts#L38)

Typed workflow handle with validated results using Result/Future pattern

#### Type Parameters

| Type Parameter                             |
| ------------------------------------------ |
| `TWorkflow` _extends_ `WorkflowDefinition` |

#### Properties

| Property                                 | Type                                                                                                                                                                                                                                              | Description                                                                                                                                       | Defined in                                                                                                                                                          |
| ---------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| <a id="cancel"></a> `cancel`             | () => `Future`&lt;`Result`&lt;`void`, `RuntimeClientError`&gt;&gt;                                                                                                                                                                                | Cancel workflow with Result pattern                                                                                                               | [packages/client/src/client.ts:92](https://github.com/btravers/temporal-contract/blob/5120f893a4e07cf022d0192f94ff01e2d170fcf9/packages/client/src/client.ts#L92)   |
| <a id="describe"></a> `describe`         | () => `Future`&lt;`Result`&lt;`Omit`&lt;`WorkflowExecutionInfo`, `"raw"`&gt; & `object` & `object`, `RuntimeClientError`&gt;&gt;                                                                                                                  | Get workflow execution description including status and metadata                                                                                  | [packages/client/src/client.ts:97](https://github.com/btravers/temporal-contract/blob/5120f893a4e07cf022d0192f94ff01e2d170fcf9/packages/client/src/client.ts#L97)   |
| <a id="fetchhistory"></a> `fetchHistory` | () => `Future`&lt;`Result`&lt;`IHistory`, `RuntimeClientError`&gt;&gt;                                                                                                                                                                            | Fetch the workflow execution history                                                                                                              | [packages/client/src/client.ts:104](https://github.com/btravers/temporal-contract/blob/5120f893a4e07cf022d0192f94ff01e2d170fcf9/packages/client/src/client.ts#L104) |
| <a id="queries"></a> `queries`           | \{ \[K in string \| number \| symbol\]: ClientInferWorkflowQueries\<TWorkflow\>\[K\] extends (args: Args) =\> Future\<Result\<R, Error\>\> ? (args: Args) =\> Future\<Result\<R, RuntimeClientError \| QueryValidationError\>\> : never \}        | Type-safe queries based on workflow definition with Result pattern Each query returns Future\<Result\<T, Error\>\> instead of Promise\<T\>        | [packages/client/src/client.ts:45](https://github.com/btravers/temporal-contract/blob/5120f893a4e07cf022d0192f94ff01e2d170fcf9/packages/client/src/client.ts#L45)   |
| <a id="result"></a> `result`             | () => `Future`&lt;`Result`&lt;[`ClientInferOutput`](#clientinferoutput)&lt;`TWorkflow`&gt;, \| [`WorkflowValidationError`](#workflowvalidationerror) \| `RuntimeClientError`&gt;&gt;                                                              | Get workflow result with Result pattern                                                                                                           | [packages/client/src/client.ts:80](https://github.com/btravers/temporal-contract/blob/5120f893a4e07cf022d0192f94ff01e2d170fcf9/packages/client/src/client.ts#L80)   |
| <a id="signals"></a> `signals`           | \{ \[K in string \| number \| symbol\]: ClientInferWorkflowSignals\<TWorkflow\>\[K\] extends (args: Args) =\> Future\<Result\<void, Error\>\> ? (args: Args) =\> Future\<Result\<void, RuntimeClientError \| SignalValidationError\>\> : never \} | Type-safe signals based on workflow definition with Result pattern Each signal returns Future\<Result\<void, Error\>\> instead of Promise\<void\> | [packages/client/src/client.ts:57](https://github.com/btravers/temporal-contract/blob/5120f893a4e07cf022d0192f94ff01e2d170fcf9/packages/client/src/client.ts#L57)   |
| <a id="terminate"></a> `terminate`       | (`reason?`) => `Future`&lt;`Result`&lt;`void`, `RuntimeClientError`&gt;&gt;                                                                                                                                                                       | Terminate workflow with Result pattern                                                                                                            | [packages/client/src/client.ts:87](https://github.com/btravers/temporal-contract/blob/5120f893a4e07cf022d0192f94ff01e2d170fcf9/packages/client/src/client.ts#L87)   |
| <a id="updates"></a> `updates`           | \{ \[K in string \| number \| symbol\]: ClientInferWorkflowUpdates\<TWorkflow\>\[K\] extends (args: Args) =\> Future\<Result\<R, Error\>\> ? (args: Args) =\> Future\<Result\<R, RuntimeClientError \| UpdateValidationError\>\> : never \}       | Type-safe updates based on workflow definition with Result pattern Each update returns Future\<Result\<T, Error\>\> instead of Promise\<T\>       | [packages/client/src/client.ts:69](https://github.com/btravers/temporal-contract/blob/5120f893a4e07cf022d0192f94ff01e2d170fcf9/packages/client/src/client.ts#L69)   |
| <a id="workflowid"></a> `workflowId`     | `string`                                                                                                                                                                                                                                          | -                                                                                                                                                 | [packages/client/src/client.ts:39](https://github.com/btravers/temporal-contract/blob/5120f893a4e07cf022d0192f94ff01e2d170fcf9/packages/client/src/client.ts#L39)   |

## Type Aliases

### ClientInferActivities&lt;TContract&gt;

```ts
type ClientInferActivities<TContract> =
  TContract["activities"] extends Record<string, ActivityDefinition>
    ? { [K in keyof TContract["activities"]]: ClientInferActivity<TContract["activities"][K]> }
    : object;
```

Defined in: [packages/client/src/types.ts:88](https://github.com/btravers/temporal-contract/blob/5120f893a4e07cf022d0192f94ff01e2d170fcf9/packages/client/src/types.ts#L88)

Infer all activities from a contract (client perspective)

#### Type Parameters

| Type Parameter                             |
| ------------------------------------------ |
| `TContract` _extends_ `ContractDefinition` |

---

### ClientInferActivity()&lt;TActivity&gt;

```ts
type ClientInferActivity<TActivity> = (args) => Promise<ClientInferOutput<TActivity>>;
```

Defined in: [packages/client/src/types.ts:46](https://github.com/btravers/temporal-contract/blob/5120f893a4e07cf022d0192f94ff01e2d170fcf9/packages/client/src/types.ts#L46)

Infer activity function signature from client perspective
Client sends z.output and receives z.input

#### Type Parameters

| Type Parameter                             |
| ------------------------------------------ |
| `TActivity` _extends_ `ActivityDefinition` |

#### Parameters

| Parameter | Type                                                       |
| --------- | ---------------------------------------------------------- |
| `args`    | [`ClientInferInput`](#clientinferinput)&lt;`TActivity`&gt; |

#### Returns

`Promise`&lt;[`ClientInferOutput`](#clientinferoutput)&lt;`TActivity`&gt;&gt;

---

### ClientInferInput&lt;T&gt;

```ts
type ClientInferInput<T> = StandardSchemaV1.InferInput<T["input"]>;
```

Defined in: [packages/client/src/types.ts:17](https://github.com/btravers/temporal-contract/blob/5120f893a4e07cf022d0192f94ff01e2d170fcf9/packages/client/src/types.ts#L17)

Infer input type from a definition (client perspective)
Client sends the input type (before input schema parsing/transformation)

#### Type Parameters

| Type Parameter         |
| ---------------------- |
| `T` _extends_ `object` |

---

### ClientInferOutput&lt;T&gt;

```ts
type ClientInferOutput<T> = StandardSchemaV1.InferOutput<T["output"]>;
```

Defined in: [packages/client/src/types.ts:25](https://github.com/btravers/temporal-contract/blob/5120f893a4e07cf022d0192f94ff01e2d170fcf9/packages/client/src/types.ts#L25)

Infer output type from a definition (client perspective)
Client receives the output type (after output schema parsing/transformation)

#### Type Parameters

| Type Parameter         |
| ---------------------- |
| `T` _extends_ `object` |

---

### ClientInferQuery()&lt;TQuery&gt;

```ts
type ClientInferQuery<TQuery> = (args) => Future<Result<ClientInferOutput<TQuery>, Error>>;
```

Defined in: [packages/client/src/types.ts:62](https://github.com/btravers/temporal-contract/blob/5120f893a4e07cf022d0192f94ff01e2d170fcf9/packages/client/src/types.ts#L62)

Infer query handler signature from client perspective
Client sends z.output and receives z.input wrapped in Future\<Result\<T, Error\>\>

#### Type Parameters

| Type Parameter                       |
| ------------------------------------ |
| `TQuery` _extends_ `QueryDefinition` |

#### Parameters

| Parameter | Type                                                    |
| --------- | ------------------------------------------------------- |
| `args`    | [`ClientInferInput`](#clientinferinput)&lt;`TQuery`&gt; |

#### Returns

`Future`&lt;`Result`&lt;[`ClientInferOutput`](#clientinferoutput)&lt;`TQuery`&gt;, `Error`&gt;&gt;

---

### ClientInferSignal()&lt;TSignal&gt;

```ts
type ClientInferSignal<TSignal> = (args) => Future<Result<void, Error>>;
```

Defined in: [packages/client/src/types.ts:54](https://github.com/btravers/temporal-contract/blob/5120f893a4e07cf022d0192f94ff01e2d170fcf9/packages/client/src/types.ts#L54)

Infer signal handler signature from client perspective
Client sends z.output and returns Future\<Result\<void, Error\>\>

#### Type Parameters

| Type Parameter                         |
| -------------------------------------- |
| `TSignal` _extends_ `SignalDefinition` |

#### Parameters

| Parameter | Type                                                     |
| --------- | -------------------------------------------------------- |
| `args`    | [`ClientInferInput`](#clientinferinput)&lt;`TSignal`&gt; |

#### Returns

`Future`&lt;`Result`&lt;`void`, `Error`&gt;&gt;

---

### ClientInferUpdate()&lt;TUpdate&gt;

```ts
type ClientInferUpdate<TUpdate> = (args) => Future<Result<ClientInferOutput<TUpdate>, Error>>;
```

Defined in: [packages/client/src/types.ts:70](https://github.com/btravers/temporal-contract/blob/5120f893a4e07cf022d0192f94ff01e2d170fcf9/packages/client/src/types.ts#L70)

Infer update handler signature from client perspective
Client sends z.output and receives z.input wrapped in Future\<Result\<T, Error\>\>

#### Type Parameters

| Type Parameter                         |
| -------------------------------------- |
| `TUpdate` _extends_ `UpdateDefinition` |

#### Parameters

| Parameter | Type                                                     |
| --------- | -------------------------------------------------------- |
| `args`    | [`ClientInferInput`](#clientinferinput)&lt;`TUpdate`&gt; |

#### Returns

`Future`&lt;`Result`&lt;[`ClientInferOutput`](#clientinferoutput)&lt;`TUpdate`&gt;, `Error`&gt;&gt;

---

### ClientInferWorkflow()&lt;TWorkflow&gt;

```ts
type ClientInferWorkflow<TWorkflow> = (args) => Promise<ClientInferOutput<TWorkflow>>;
```

Defined in: [packages/client/src/types.ts:38](https://github.com/btravers/temporal-contract/blob/5120f893a4e07cf022d0192f94ff01e2d170fcf9/packages/client/src/types.ts#L38)

Infer workflow function signature from client perspective
Client sends z.output and receives z.input

#### Type Parameters

| Type Parameter                             |
| ------------------------------------------ |
| `TWorkflow` _extends_ `WorkflowDefinition` |

#### Parameters

| Parameter | Type                                                       |
| --------- | ---------------------------------------------------------- |
| `args`    | [`ClientInferInput`](#clientinferinput)&lt;`TWorkflow`&gt; |

#### Returns

`Promise`&lt;[`ClientInferOutput`](#clientinferoutput)&lt;`TWorkflow`&gt;&gt;

---

### ClientInferWorkflowActivities&lt;T&gt;

```ts
type ClientInferWorkflowActivities<T> =
  T["activities"] extends Record<string, ActivityDefinition>
    ? { [K in keyof T["activities"]]: ClientInferActivity<T["activities"][K]> }
    : object;
```

Defined in: [packages/client/src/types.ts:98](https://github.com/btravers/temporal-contract/blob/5120f893a4e07cf022d0192f94ff01e2d170fcf9/packages/client/src/types.ts#L98)

Infer activities from a workflow definition (client perspective)

#### Type Parameters

| Type Parameter                     |
| ---------------------------------- |
| `T` _extends_ `WorkflowDefinition` |

---

### ClientInferWorkflowContextActivities&lt;TContract, TWorkflowName&gt;

```ts
type ClientInferWorkflowContextActivities<TContract, TWorkflowName> = ClientInferWorkflowActivities<
  TContract["workflows"][TWorkflowName]
> &
  ClientInferActivities<TContract>;
```

Defined in: [packages/client/src/types.ts:139](https://github.com/btravers/temporal-contract/blob/5120f893a4e07cf022d0192f94ff01e2d170fcf9/packages/client/src/types.ts#L139)

Infer all activities available in a workflow context (client perspective)
Combines workflow-specific activities with global activities

#### Type Parameters

| Type Parameter                                               |
| ------------------------------------------------------------ |
| `TContract` _extends_ `ContractDefinition`                   |
| `TWorkflowName` _extends_ keyof `TContract`\[`"workflows"`\] |

---

### ClientInferWorkflowQueries&lt;T&gt;

```ts
type ClientInferWorkflowQueries<T> =
  T["queries"] extends Record<string, QueryDefinition>
    ? { [K in keyof T["queries"]]: ClientInferQuery<T["queries"][K]> }
    : object;
```

Defined in: [packages/client/src/types.ts:118](https://github.com/btravers/temporal-contract/blob/5120f893a4e07cf022d0192f94ff01e2d170fcf9/packages/client/src/types.ts#L118)

Infer queries from a workflow definition (client perspective)

#### Type Parameters

| Type Parameter                     |
| ---------------------------------- |
| `T` _extends_ `WorkflowDefinition` |

---

### ClientInferWorkflows&lt;TContract&gt;

```ts
type ClientInferWorkflows<TContract> = {
  [K in keyof TContract["workflows"]]: ClientInferWorkflow<TContract["workflows"][K]>;
};
```

Defined in: [packages/client/src/types.ts:81](https://github.com/btravers/temporal-contract/blob/5120f893a4e07cf022d0192f94ff01e2d170fcf9/packages/client/src/types.ts#L81)

Infer all workflows from a contract (client perspective)

#### Type Parameters

| Type Parameter                             |
| ------------------------------------------ |
| `TContract` _extends_ `ContractDefinition` |

---

### ClientInferWorkflowSignals&lt;T&gt;

```ts
type ClientInferWorkflowSignals<T> =
  T["signals"] extends Record<string, SignalDefinition>
    ? { [K in keyof T["signals"]]: ClientInferSignal<T["signals"][K]> }
    : object;
```

Defined in: [packages/client/src/types.ts:108](https://github.com/btravers/temporal-contract/blob/5120f893a4e07cf022d0192f94ff01e2d170fcf9/packages/client/src/types.ts#L108)

Infer signals from a workflow definition (client perspective)

#### Type Parameters

| Type Parameter                     |
| ---------------------------------- |
| `T` _extends_ `WorkflowDefinition` |

---

### ClientInferWorkflowUpdates&lt;T&gt;

```ts
type ClientInferWorkflowUpdates<T> =
  T["updates"] extends Record<string, UpdateDefinition>
    ? { [K in keyof T["updates"]]: ClientInferUpdate<T["updates"][K]> }
    : object;
```

Defined in: [packages/client/src/types.ts:128](https://github.com/btravers/temporal-contract/blob/5120f893a4e07cf022d0192f94ff01e2d170fcf9/packages/client/src/types.ts#L128)

Infer updates from a workflow definition (client perspective)

#### Type Parameters

| Type Parameter                     |
| ---------------------------------- |
| `T` _extends_ `WorkflowDefinition` |

---

### TypedWorkflowStartOptions&lt;TContract, TWorkflowName&gt;

```ts
type TypedWorkflowStartOptions<TContract, TWorkflowName> = Omit<
  WorkflowStartOptions,
  "taskQueue" | "args"
> &
  object;
```

Defined in: [packages/client/src/client.ts:28](https://github.com/btravers/temporal-contract/blob/5120f893a4e07cf022d0192f94ff01e2d170fcf9/packages/client/src/client.ts#L28)

#### Type declaration

| Name   | Type                                                                                           | Defined in                                                                                                                                                        |
| ------ | ---------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `args` | [`ClientInferInput`](#clientinferinput)&lt;`TContract`\[`"workflows"`\]\[`TWorkflowName`\]&gt; | [packages/client/src/client.ts:32](https://github.com/btravers/temporal-contract/blob/5120f893a4e07cf022d0192f94ff01e2d170fcf9/packages/client/src/client.ts#L32) |

#### Type Parameters

| Type Parameter                                               |
| ------------------------------------------------------------ |
| `TContract` _extends_ `ContractDefinition`                   |
| `TWorkflowName` _extends_ keyof `TContract`\[`"workflows"`\] |
