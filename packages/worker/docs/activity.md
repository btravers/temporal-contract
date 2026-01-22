[**@temporal-contract/worker**](index.md)

---

[@temporal-contract/worker](index.md) / activity

# activity

## Classes

### ActivityDefinitionNotFoundError

Defined in: [packages/worker/src/errors.ts:20](https://github.com/btravers/temporal-contract/blob/5120f893a4e07cf022d0192f94ff01e2d170fcf9/packages/worker/src/errors.ts#L20)

Error thrown when an activity definition is not found in the contract

#### Extends

- `WorkerError`

#### Constructors

##### Constructor

```ts
new ActivityDefinitionNotFoundError(activityName, availableDefinitions): ActivityDefinitionNotFoundError;
```

Defined in: [packages/worker/src/errors.ts:21](https://github.com/btravers/temporal-contract/blob/5120f893a4e07cf022d0192f94ff01e2d170fcf9/packages/worker/src/errors.ts#L21)

###### Parameters

| Parameter              | Type                | Default value |
| ---------------------- | ------------------- | ------------- |
| `activityName`         | `string`            | `undefined`   |
| `availableDefinitions` | readonly `string`[] | `[]`          |

###### Returns

[`ActivityDefinitionNotFoundError`](#activitydefinitionnotfounderror)

###### Overrides

```ts
WorkerError.constructor;
```

#### Properties

| Property                                                 | Modifier   | Type                | Default value | Description                                                                                                                                                                                                                                                                                                                                                                                                                                       | Inherited from                | Defined in                                                                                                                                                        |
| -------------------------------------------------------- | ---------- | ------------------- | ------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| <a id="activityname"></a> `activityName`                 | `readonly` | `string`            | `undefined`   | -                                                                                                                                                                                                                                                                                                                                                                                                                                                 | -                             | [packages/worker/src/errors.ts:22](https://github.com/btravers/temporal-contract/blob/5120f893a4e07cf022d0192f94ff01e2d170fcf9/packages/worker/src/errors.ts#L22) |
| <a id="availabledefinitions"></a> `availableDefinitions` | `readonly` | readonly `string`[] | `[]`          | -                                                                                                                                                                                                                                                                                                                                                                                                                                                 | -                             | [packages/worker/src/errors.ts:23](https://github.com/btravers/temporal-contract/blob/5120f893a4e07cf022d0192f94ff01e2d170fcf9/packages/worker/src/errors.ts#L23) |
| <a id="cause"></a> `cause?`                              | `public`   | `unknown`           | `undefined`   | -                                                                                                                                                                                                                                                                                                                                                                                                                                                 | `WorkerError.cause`           | node_modules/.pnpm/typescript@5.9.3/node_modules/typescript/lib/lib.es2022.error.d.ts:26                                                                          |
| <a id="message"></a> `message`                           | `public`   | `string`            | `undefined`   | -                                                                                                                                                                                                                                                                                                                                                                                                                                                 | `WorkerError.message`         | node_modules/.pnpm/typescript@5.9.3/node_modules/typescript/lib/lib.es5.d.ts:1077                                                                                 |
| <a id="name"></a> `name`                                 | `public`   | `string`            | `undefined`   | -                                                                                                                                                                                                                                                                                                                                                                                                                                                 | `WorkerError.name`            | node_modules/.pnpm/typescript@5.9.3/node_modules/typescript/lib/lib.es5.d.ts:1076                                                                                 |
| <a id="stack"></a> `stack?`                              | `public`   | `string`            | `undefined`   | -                                                                                                                                                                                                                                                                                                                                                                                                                                                 | `WorkerError.stack`           | node_modules/.pnpm/typescript@5.9.3/node_modules/typescript/lib/lib.es5.d.ts:1078                                                                                 |
| <a id="stacktracelimit"></a> `stackTraceLimit`           | `static`   | `number`            | `undefined`   | The `Error.stackTraceLimit` property specifies the number of stack frames collected by a stack trace (whether generated by `new Error().stack` or `Error.captureStackTrace(obj)`). The default value is `10` but may be set to any valid JavaScript number. Changes will affect any stack trace captured _after_ the value has been changed. If set to a non-number value, or set to a negative number, stack traces will not capture any frames. | `WorkerError.stackTraceLimit` | node_modules/.pnpm/@types+node@25.0.9/node_modules/@types/node/globals.d.ts:67                                                                                    |

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
WorkerError.captureStackTrace;
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
WorkerError.prepareStackTrace;
```

---

### ActivityError

Defined in: [packages/worker/src/activity.ts:28](https://github.com/btravers/temporal-contract/blob/5120f893a4e07cf022d0192f94ff01e2d170fcf9/packages/worker/src/activity.ts#L28)

Activity error class that should be used to wrap all technical exceptions
Forces proper error handling and enables retry policies

#### Extends

- `Error`

#### Constructors

##### Constructor

```ts
new ActivityError(
   code,
   message,
   cause?): ActivityError;
```

Defined in: [packages/worker/src/activity.ts:29](https://github.com/btravers/temporal-contract/blob/5120f893a4e07cf022d0192f94ff01e2d170fcf9/packages/worker/src/activity.ts#L29)

###### Parameters

| Parameter | Type      |
| --------- | --------- |
| `code`    | `string`  |
| `message` | `string`  |
| `cause?`  | `unknown` |

###### Returns

[`ActivityError`](#activityerror)

###### Overrides

```ts
Error.constructor;
```

#### Properties

| Property                                         | Modifier   | Type      | Description                                                                                                                                                                                                                                                                                                                                                                                                                                       | Inherited from          | Defined in                                                                                                                                                            |
| ------------------------------------------------ | ---------- | --------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| <a id="cause-1"></a> `cause?`                    | `public`   | `unknown` | -                                                                                                                                                                                                                                                                                                                                                                                                                                                 | `Error.cause`           | node_modules/.pnpm/typescript@5.9.3/node_modules/typescript/lib/lib.es2022.error.d.ts:26                                                                              |
| <a id="code"></a> `code`                         | `readonly` | `string`  | -                                                                                                                                                                                                                                                                                                                                                                                                                                                 | -                       | [packages/worker/src/activity.ts:30](https://github.com/btravers/temporal-contract/blob/5120f893a4e07cf022d0192f94ff01e2d170fcf9/packages/worker/src/activity.ts#L30) |
| <a id="message-1"></a> `message`                 | `public`   | `string`  | -                                                                                                                                                                                                                                                                                                                                                                                                                                                 | `Error.message`         | node_modules/.pnpm/typescript@5.9.3/node_modules/typescript/lib/lib.es5.d.ts:1077                                                                                     |
| <a id="name-1"></a> `name`                       | `public`   | `string`  | -                                                                                                                                                                                                                                                                                                                                                                                                                                                 | `Error.name`            | node_modules/.pnpm/typescript@5.9.3/node_modules/typescript/lib/lib.es5.d.ts:1076                                                                                     |
| <a id="stack-1"></a> `stack?`                    | `public`   | `string`  | -                                                                                                                                                                                                                                                                                                                                                                                                                                                 | `Error.stack`           | node_modules/.pnpm/typescript@5.9.3/node_modules/typescript/lib/lib.es5.d.ts:1078                                                                                     |
| <a id="stacktracelimit-1"></a> `stackTraceLimit` | `static`   | `number`  | The `Error.stackTraceLimit` property specifies the number of stack frames collected by a stack trace (whether generated by `new Error().stack` or `Error.captureStackTrace(obj)`). The default value is `10` but may be set to any valid JavaScript number. Changes will affect any stack trace captured _after_ the value has been changed. If set to a non-number value, or set to a negative number, stack traces will not capture any frames. | `Error.stackTraceLimit` | node_modules/.pnpm/@types+node@25.0.9/node_modules/@types/node/globals.d.ts:67                                                                                        |

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
Error.captureStackTrace;
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
Error.prepareStackTrace;
```

---

### ActivityInputValidationError

Defined in: [packages/worker/src/errors.ts:36](https://github.com/btravers/temporal-contract/blob/5120f893a4e07cf022d0192f94ff01e2d170fcf9/packages/worker/src/errors.ts#L36)

Error thrown when activity input validation fails

#### Extends

- `WorkerError`

#### Constructors

##### Constructor

```ts
new ActivityInputValidationError(activityName, issues): ActivityInputValidationError;
```

Defined in: [packages/worker/src/errors.ts:37](https://github.com/btravers/temporal-contract/blob/5120f893a4e07cf022d0192f94ff01e2d170fcf9/packages/worker/src/errors.ts#L37)

###### Parameters

| Parameter      | Type               |
| -------------- | ------------------ |
| `activityName` | `string`           |
| `issues`       | readonly `Issue`[] |

###### Returns

[`ActivityInputValidationError`](#activityinputvalidationerror)

###### Overrides

```ts
WorkerError.constructor;
```

#### Properties

| Property                                         | Modifier   | Type               | Description                                                                                                                                                                                                                                                                                                                                                                                                                                       | Inherited from                | Defined in                                                                                                                                                        |
| ------------------------------------------------ | ---------- | ------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| <a id="activityname-1"></a> `activityName`       | `readonly` | `string`           | -                                                                                                                                                                                                                                                                                                                                                                                                                                                 | -                             | [packages/worker/src/errors.ts:38](https://github.com/btravers/temporal-contract/blob/5120f893a4e07cf022d0192f94ff01e2d170fcf9/packages/worker/src/errors.ts#L38) |
| <a id="cause-2"></a> `cause?`                    | `public`   | `unknown`          | -                                                                                                                                                                                                                                                                                                                                                                                                                                                 | `WorkerError.cause`           | node_modules/.pnpm/typescript@5.9.3/node_modules/typescript/lib/lib.es2022.error.d.ts:26                                                                          |
| <a id="issues"></a> `issues`                     | `readonly` | readonly `Issue`[] | -                                                                                                                                                                                                                                                                                                                                                                                                                                                 | -                             | [packages/worker/src/errors.ts:39](https://github.com/btravers/temporal-contract/blob/5120f893a4e07cf022d0192f94ff01e2d170fcf9/packages/worker/src/errors.ts#L39) |
| <a id="message-2"></a> `message`                 | `public`   | `string`           | -                                                                                                                                                                                                                                                                                                                                                                                                                                                 | `WorkerError.message`         | node_modules/.pnpm/typescript@5.9.3/node_modules/typescript/lib/lib.es5.d.ts:1077                                                                                 |
| <a id="name-2"></a> `name`                       | `public`   | `string`           | -                                                                                                                                                                                                                                                                                                                                                                                                                                                 | `WorkerError.name`            | node_modules/.pnpm/typescript@5.9.3/node_modules/typescript/lib/lib.es5.d.ts:1076                                                                                 |
| <a id="stack-2"></a> `stack?`                    | `public`   | `string`           | -                                                                                                                                                                                                                                                                                                                                                                                                                                                 | `WorkerError.stack`           | node_modules/.pnpm/typescript@5.9.3/node_modules/typescript/lib/lib.es5.d.ts:1078                                                                                 |
| <a id="stacktracelimit-2"></a> `stackTraceLimit` | `static`   | `number`           | The `Error.stackTraceLimit` property specifies the number of stack frames collected by a stack trace (whether generated by `new Error().stack` or `Error.captureStackTrace(obj)`). The default value is `10` but may be set to any valid JavaScript number. Changes will affect any stack trace captured _after_ the value has been changed. If set to a non-number value, or set to a negative number, stack traces will not capture any frames. | `WorkerError.stackTraceLimit` | node_modules/.pnpm/@types+node@25.0.9/node_modules/@types/node/globals.d.ts:67                                                                                    |

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
WorkerError.captureStackTrace;
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
WorkerError.prepareStackTrace;
```

---

### ActivityOutputValidationError

Defined in: [packages/worker/src/errors.ts:50](https://github.com/btravers/temporal-contract/blob/5120f893a4e07cf022d0192f94ff01e2d170fcf9/packages/worker/src/errors.ts#L50)

Error thrown when activity output validation fails

#### Extends

- `WorkerError`

#### Constructors

##### Constructor

```ts
new ActivityOutputValidationError(activityName, issues): ActivityOutputValidationError;
```

Defined in: [packages/worker/src/errors.ts:51](https://github.com/btravers/temporal-contract/blob/5120f893a4e07cf022d0192f94ff01e2d170fcf9/packages/worker/src/errors.ts#L51)

###### Parameters

| Parameter      | Type               |
| -------------- | ------------------ |
| `activityName` | `string`           |
| `issues`       | readonly `Issue`[] |

###### Returns

[`ActivityOutputValidationError`](#activityoutputvalidationerror)

###### Overrides

```ts
WorkerError.constructor;
```

#### Properties

| Property                                         | Modifier   | Type               | Description                                                                                                                                                                                                                                                                                                                                                                                                                                       | Inherited from                | Defined in                                                                                                                                                        |
| ------------------------------------------------ | ---------- | ------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| <a id="activityname-2"></a> `activityName`       | `readonly` | `string`           | -                                                                                                                                                                                                                                                                                                                                                                                                                                                 | -                             | [packages/worker/src/errors.ts:52](https://github.com/btravers/temporal-contract/blob/5120f893a4e07cf022d0192f94ff01e2d170fcf9/packages/worker/src/errors.ts#L52) |
| <a id="cause-3"></a> `cause?`                    | `public`   | `unknown`          | -                                                                                                                                                                                                                                                                                                                                                                                                                                                 | `WorkerError.cause`           | node_modules/.pnpm/typescript@5.9.3/node_modules/typescript/lib/lib.es2022.error.d.ts:26                                                                          |
| <a id="issues-1"></a> `issues`                   | `readonly` | readonly `Issue`[] | -                                                                                                                                                                                                                                                                                                                                                                                                                                                 | -                             | [packages/worker/src/errors.ts:53](https://github.com/btravers/temporal-contract/blob/5120f893a4e07cf022d0192f94ff01e2d170fcf9/packages/worker/src/errors.ts#L53) |
| <a id="message-3"></a> `message`                 | `public`   | `string`           | -                                                                                                                                                                                                                                                                                                                                                                                                                                                 | `WorkerError.message`         | node_modules/.pnpm/typescript@5.9.3/node_modules/typescript/lib/lib.es5.d.ts:1077                                                                                 |
| <a id="name-3"></a> `name`                       | `public`   | `string`           | -                                                                                                                                                                                                                                                                                                                                                                                                                                                 | `WorkerError.name`            | node_modules/.pnpm/typescript@5.9.3/node_modules/typescript/lib/lib.es5.d.ts:1076                                                                                 |
| <a id="stack-3"></a> `stack?`                    | `public`   | `string`           | -                                                                                                                                                                                                                                                                                                                                                                                                                                                 | `WorkerError.stack`           | node_modules/.pnpm/typescript@5.9.3/node_modules/typescript/lib/lib.es5.d.ts:1078                                                                                 |
| <a id="stacktracelimit-3"></a> `stackTraceLimit` | `static`   | `number`           | The `Error.stackTraceLimit` property specifies the number of stack frames collected by a stack trace (whether generated by `new Error().stack` or `Error.captureStackTrace(obj)`). The default value is `10` but may be set to any valid JavaScript number. Changes will affect any stack trace captured _after_ the value has been changed. If set to a non-number value, or set to a negative number, stack traces will not capture any frames. | `WorkerError.stackTraceLimit` | node_modules/.pnpm/@types+node@25.0.9/node_modules/@types/node/globals.d.ts:67                                                                                    |

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
WorkerError.captureStackTrace;
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
WorkerError.prepareStackTrace;
```

## Type Aliases

### ActivitiesHandler&lt;TContract&gt;

```ts
type ActivitiesHandler<TContract> =
  TContract["activities"] extends Record<string, ActivityDefinition>
    ? ActivitiesImplementations<TContract["activities"]>
    : object &
        UnionToIntersection<
          {
            [TWorkflow in keyof TContract["workflows"]]: TContract["workflows"][TWorkflow]["activities"] extends Record<
              string,
              ActivityDefinition
            >
              ? ActivitiesImplementations<TContract["workflows"][TWorkflow]["activities"]>
              : {};
          }[keyof TContract["workflows"]]
        >;
```

Defined in: [packages/worker/src/activity.ts:102](https://github.com/btravers/temporal-contract/blob/5120f893a4e07cf022d0192f94ff01e2d170fcf9/packages/worker/src/activity.ts#L102)

Activities handler ready for Temporal Worker

Flat structure: all activities (global + all workflow-specific) are at the root level

#### Type Parameters

| Type Parameter                             |
| ------------------------------------------ |
| `TContract` _extends_ `ContractDefinition` |

## Functions

### declareActivitiesHandler()

```ts
function declareActivitiesHandler<TContract>(options): ActivitiesHandler<TContract>;
```

Defined in: [packages/worker/src/activity.ts:172](https://github.com/btravers/temporal-contract/blob/5120f893a4e07cf022d0192f94ff01e2d170fcf9/packages/worker/src/activity.ts#L172)

Create a typed activities handler with automatic validation and Result pattern

This wraps all activity implementations with:

- Validation at network boundaries
- Result\<T, ActivityError\> pattern for explicit error handling
- Automatic conversion from Result to Promise (throwing on Error)

TypeScript ensures ALL activities (global + workflow-specific) are implemented.

Use this to create the activities object for the Temporal Worker.

#### Type Parameters

| Type Parameter                                                                                                                                                                                                                                                                                                                                                                                                                                                                                     |
| -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `TContract` _extends_ `ContractDefinition`&lt;`Record`&lt;`string`, `WorkflowDefinition`&lt;`Record`&lt;`string`, `ActivityDefinition`&lt;`AnySchema`, `AnySchema`&gt;&gt;, `Record`&lt;`string`, `SignalDefinition`&lt;`AnySchema`&gt;&gt;, `Record`&lt;`string`, `QueryDefinition`&lt;`AnySchema`, `AnySchema`&gt;&gt;, `Record`&lt;`string`, `UpdateDefinition`&lt;`AnySchema`, `AnySchema`&gt;&gt;&gt;&gt;, `Record`&lt;`string`, `ActivityDefinition`&lt;`AnySchema`, `AnySchema`&gt;&gt;&gt; |

#### Parameters

| Parameter | Type                                                 |
| --------- | ---------------------------------------------------- |
| `options` | `DeclareActivitiesHandlerOptions`&lt;`TContract`&gt; |

#### Returns

[`ActivitiesHandler`](#activitieshandler)&lt;`TContract`&gt;

#### Example

```ts
import { declareActivitiesHandler, ActivityError } from "@temporal-contract/worker/activity";
import { Result, Future } from "@swan-io/boxed";
import myContract from "./contract";

export const activities = declareActivitiesHandler({
  contract: myContract,
  activities: {
    // Activity returns Result instead of throwing
    // All technical exceptions must be wrapped in ActivityError for retry policies
    sendEmail: (args) => {
      return Future.make(async (resolve) => {
        try {
          await emailService.send(args);
          resolve(Result.Ok({ sent: true }));
        } catch (error) {
          // Wrap technical errors in ActivityError to enable retries
          resolve(
            Result.Error(
              new ActivityError(
                "EMAIL_SEND_FAILED",
                "Failed to send email",
                error, // Original error as cause for debugging
              ),
            ),
          );
        }
      });
    },
  },
});

// Use with Temporal Worker
import { Worker } from "@temporalio/worker";

const worker = await Worker.create({
  workflowsPath: require.resolve("./workflows"),
  activities: activities,
  taskQueue: contract.taskQueue,
});
```

---

### getWorkflowActivities()

```ts
function getWorkflowActivities<TContract, TWorkflowName>(
  contract,
  workflowName,
): Record<string, ActivityDefinition>;
```

Defined in: [packages/worker/src/activity-utils.ts:22](https://github.com/btravers/temporal-contract/blob/5120f893a4e07cf022d0192f94ff01e2d170fcf9/packages/worker/src/activity-utils.ts#L22)

Extract activity definitions for a specific workflow from a contract

This includes both:

- Workflow-specific activities defined under workflow.activities
- Global activities defined under contract.activities

#### Type Parameters

| Type Parameter                                                                                                                                                                                                                                                                                                                                                                                                                                                                                     |
| -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `TContract` _extends_ `ContractDefinition`&lt;`Record`&lt;`string`, `WorkflowDefinition`&lt;`Record`&lt;`string`, `ActivityDefinition`&lt;`AnySchema`, `AnySchema`&gt;&gt;, `Record`&lt;`string`, `SignalDefinition`&lt;`AnySchema`&gt;&gt;, `Record`&lt;`string`, `QueryDefinition`&lt;`AnySchema`, `AnySchema`&gt;&gt;, `Record`&lt;`string`, `UpdateDefinition`&lt;`AnySchema`, `AnySchema`&gt;&gt;&gt;&gt;, `Record`&lt;`string`, `ActivityDefinition`&lt;`AnySchema`, `AnySchema`&gt;&gt;&gt; |
| `TWorkflowName` _extends_ `string` \| `number` \| `symbol`                                                                                                                                                                                                                                                                                                                                                                                                                                         |

#### Parameters

| Parameter      | Type            | Description              |
| -------------- | --------------- | ------------------------ |
| `contract`     | `TContract`     | The contract definition  |
| `workflowName` | `TWorkflowName` | The name of the workflow |

#### Returns

`Record`&lt;`string`, `ActivityDefinition`&gt;

Activity definitions for the workflow (workflow-specific + global activities merged)

#### Example

```ts
const orderWorkflowActivities = getWorkflowActivities(myContract, "processOrder");
// Returns: { processPayment: ActivityDef, reserveInventory: ActivityDef, sendEmail: ActivityDef }
// where sendEmail is a global activity
```

---

### getWorkflowActivityNames()

```ts
function getWorkflowActivityNames<TContract, TWorkflowName>(contract, workflowName): string[];
```

Defined in: [packages/worker/src/activity-utils.ts:52](https://github.com/btravers/temporal-contract/blob/5120f893a4e07cf022d0192f94ff01e2d170fcf9/packages/worker/src/activity-utils.ts#L52)

Extract all activity names for a specific workflow from a contract

#### Type Parameters

| Type Parameter                                                                                                                                                                                                                                                                                                                                                                                                                                                                                     |
| -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `TContract` _extends_ `ContractDefinition`&lt;`Record`&lt;`string`, `WorkflowDefinition`&lt;`Record`&lt;`string`, `ActivityDefinition`&lt;`AnySchema`, `AnySchema`&gt;&gt;, `Record`&lt;`string`, `SignalDefinition`&lt;`AnySchema`&gt;&gt;, `Record`&lt;`string`, `QueryDefinition`&lt;`AnySchema`, `AnySchema`&gt;&gt;, `Record`&lt;`string`, `UpdateDefinition`&lt;`AnySchema`, `AnySchema`&gt;&gt;&gt;&gt;, `Record`&lt;`string`, `ActivityDefinition`&lt;`AnySchema`, `AnySchema`&gt;&gt;&gt; |
| `TWorkflowName` _extends_ `string` \| `number` \| `symbol`                                                                                                                                                                                                                                                                                                                                                                                                                                         |

#### Parameters

| Parameter      | Type            | Description              |
| -------------- | --------------- | ------------------------ |
| `contract`     | `TContract`     | The contract definition  |
| `workflowName` | `TWorkflowName` | The name of the workflow |

#### Returns

`string`[]

Array of activity names (strings) available for the workflow

#### Example

```ts
const activityNames = getWorkflowActivityNames(myContract, "processOrder");
// Returns: ['processPayment', 'reserveInventory', 'sendEmail']
```

---

### getWorkflowNames()

```ts
function getWorkflowNames<TContract>(contract): keyof TContract["workflows"][];
```

Defined in: [packages/worker/src/activity-utils.ts:95](https://github.com/btravers/temporal-contract/blob/5120f893a4e07cf022d0192f94ff01e2d170fcf9/packages/worker/src/activity-utils.ts#L95)

Get all workflow names from a contract

#### Type Parameters

| Type Parameter                                                                                                                                                                                                                                                                                                                                                                                                                                                                                     |
| -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `TContract` _extends_ `ContractDefinition`&lt;`Record`&lt;`string`, `WorkflowDefinition`&lt;`Record`&lt;`string`, `ActivityDefinition`&lt;`AnySchema`, `AnySchema`&gt;&gt;, `Record`&lt;`string`, `SignalDefinition`&lt;`AnySchema`&gt;&gt;, `Record`&lt;`string`, `QueryDefinition`&lt;`AnySchema`, `AnySchema`&gt;&gt;, `Record`&lt;`string`, `UpdateDefinition`&lt;`AnySchema`, `AnySchema`&gt;&gt;&gt;&gt;, `Record`&lt;`string`, `ActivityDefinition`&lt;`AnySchema`, `AnySchema`&gt;&gt;&gt; |

#### Parameters

| Parameter  | Type        | Description             |
| ---------- | ----------- | ----------------------- |
| `contract` | `TContract` | The contract definition |

#### Returns

keyof `TContract`\[`"workflows"`\][]

Array of workflow names defined in the contract

#### Example

```ts
const workflows = getWorkflowNames(myContract);
// Returns: ['processOrder', 'processRefund']
```

---

### isWorkflowActivity()

```ts
function isWorkflowActivity<TContract, TWorkflowName>(
  contract,
  workflowName,
  activityName,
): boolean;
```

Defined in: [packages/worker/src/activity-utils.ts:75](https://github.com/btravers/temporal-contract/blob/5120f893a4e07cf022d0192f94ff01e2d170fcf9/packages/worker/src/activity-utils.ts#L75)

Check if an activity belongs to a specific workflow

#### Type Parameters

| Type Parameter                                                                                                                                                                                                                                                                                                                                                                                                                                                                                     |
| -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `TContract` _extends_ `ContractDefinition`&lt;`Record`&lt;`string`, `WorkflowDefinition`&lt;`Record`&lt;`string`, `ActivityDefinition`&lt;`AnySchema`, `AnySchema`&gt;&gt;, `Record`&lt;`string`, `SignalDefinition`&lt;`AnySchema`&gt;&gt;, `Record`&lt;`string`, `QueryDefinition`&lt;`AnySchema`, `AnySchema`&gt;&gt;, `Record`&lt;`string`, `UpdateDefinition`&lt;`AnySchema`, `AnySchema`&gt;&gt;&gt;&gt;, `Record`&lt;`string`, `ActivityDefinition`&lt;`AnySchema`, `AnySchema`&gt;&gt;&gt; |
| `TWorkflowName` _extends_ `string` \| `number` \| `symbol`                                                                                                                                                                                                                                                                                                                                                                                                                                         |

#### Parameters

| Parameter      | Type            | Description                       |
| -------------- | --------------- | --------------------------------- |
| `contract`     | `TContract`     | The contract definition           |
| `workflowName` | `TWorkflowName` | The name of the workflow          |
| `activityName` | `string`        | The name of the activity to check |

#### Returns

`boolean`

True if the activity is available for the workflow, false otherwise

#### Example

```ts
if (isWorkflowActivity(myContract, "processOrder", "processPayment")) {
  // Activity is available for this workflow
}
```
