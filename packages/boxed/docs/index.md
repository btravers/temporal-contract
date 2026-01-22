**@temporal-contract/boxed**

---

# @temporal-contract/boxed

Custom implementation of Future and Result patterns for Temporal workflows

This package provides a Temporal-compatible implementation of the Result and Future
patterns that were originally provided by @swan-io/boxed.

## Classes

### Error&lt;T, E&gt;

Defined in: [result.ts:63](https://github.com/btravers/temporal-contract/blob/5120f893a4e07cf022d0192f94ff01e2d170fcf9/packages/boxed/src/result.ts#L63)

Error variant representing a failed result

#### Type Parameters

| Type Parameter |
| -------------- |
| `T`            |
| `E`            |

#### Constructors

##### Constructor

```ts
new Error<T, E>(error): Error<T, E>;
```

Defined in: [result.ts:67](https://github.com/btravers/temporal-contract/blob/5120f893a4e07cf022d0192f94ff01e2d170fcf9/packages/boxed/src/result.ts#L67)

###### Parameters

| Parameter | Type |
| --------- | ---- |
| `error`   | `E`  |

###### Returns

[`Error`](#error)&lt;`T`, `E`&gt;

#### Properties

| Property                     | Modifier   | Type      | Defined in                                                                                                                                   |
| ---------------------------- | ---------- | --------- | -------------------------------------------------------------------------------------------------------------------------------------------- |
| <a id="error-1"></a> `error` | `readonly` | `E`       | [result.ts:65](https://github.com/btravers/temporal-contract/blob/5120f893a4e07cf022d0192f94ff01e2d170fcf9/packages/boxed/src/result.ts#L65) |
| <a id="tag"></a> `tag`       | `readonly` | `"Error"` | [result.ts:64](https://github.com/btravers/temporal-contract/blob/5120f893a4e07cf022d0192f94ff01e2d170fcf9/packages/boxed/src/result.ts#L64) |

#### Methods

##### flatMap()

```ts
flatMap<U>(_fn): Result<U, E>;
```

Defined in: [result.ts:87](https://github.com/btravers/temporal-contract/blob/5120f893a4e07cf022d0192f94ff01e2d170fcf9/packages/boxed/src/result.ts#L87)

###### Type Parameters

| Type Parameter |
| -------------- |
| `U`            |

###### Parameters

| Parameter | Type                                             |
| --------- | ------------------------------------------------ |
| `_fn`     | (`value`) => [`Result`](#result)&lt;`U`, `E`&gt; |

###### Returns

[`Result`](#result)&lt;`U`, `E`&gt;

##### flatMapOk()

```ts
flatMapOk<U>(_fn): Result<U, E>;
```

Defined in: [result.ts:91](https://github.com/btravers/temporal-contract/blob/5120f893a4e07cf022d0192f94ff01e2d170fcf9/packages/boxed/src/result.ts#L91)

###### Type Parameters

| Type Parameter |
| -------------- |
| `U`            |

###### Parameters

| Parameter | Type                                             |
| --------- | ------------------------------------------------ |
| `_fn`     | (`value`) => [`Result`](#result)&lt;`U`, `E`&gt; |

###### Returns

[`Result`](#result)&lt;`U`, `E`&gt;

##### getOr()

```ts
getOr(defaultValue): T;
```

Defined in: [result.ts:95](https://github.com/btravers/temporal-contract/blob/5120f893a4e07cf022d0192f94ff01e2d170fcf9/packages/boxed/src/result.ts#L95)

###### Parameters

| Parameter      | Type |
| -------------- | ---- |
| `defaultValue` | `T`  |

###### Returns

`T`

##### getWithDefault()

```ts
getWithDefault(defaultValue): T;
```

Defined in: [result.ts:99](https://github.com/btravers/temporal-contract/blob/5120f893a4e07cf022d0192f94ff01e2d170fcf9/packages/boxed/src/result.ts#L99)

###### Parameters

| Parameter      | Type |
| -------------- | ---- |
| `defaultValue` | `T`  |

###### Returns

`T`

##### isError()

```ts
isError(): this is Error<T, E>;
```

Defined in: [result.ts:75](https://github.com/btravers/temporal-contract/blob/5120f893a4e07cf022d0192f94ff01e2d170fcf9/packages/boxed/src/result.ts#L75)

###### Returns

`this is Error<T, E>`

##### isOk()

```ts
isOk(): this is Ok<T, E>;
```

Defined in: [result.ts:71](https://github.com/btravers/temporal-contract/blob/5120f893a4e07cf022d0192f94ff01e2d170fcf9/packages/boxed/src/result.ts#L71)

###### Returns

`this is Ok<T, E>`

##### map()

```ts
map<U>(_fn): Result<U, E>;
```

Defined in: [result.ts:79](https://github.com/btravers/temporal-contract/blob/5120f893a4e07cf022d0192f94ff01e2d170fcf9/packages/boxed/src/result.ts#L79)

###### Type Parameters

| Type Parameter |
| -------------- |
| `U`            |

###### Parameters

| Parameter | Type             |
| --------- | ---------------- |
| `_fn`     | (`value`) => `U` |

###### Returns

[`Result`](#result)&lt;`U`, `E`&gt;

##### mapError()

```ts
mapError<F>(fn): Result<T, F>;
```

Defined in: [result.ts:83](https://github.com/btravers/temporal-contract/blob/5120f893a4e07cf022d0192f94ff01e2d170fcf9/packages/boxed/src/result.ts#L83)

###### Type Parameters

| Type Parameter |
| -------------- |
| `F`            |

###### Parameters

| Parameter | Type             |
| --------- | ---------------- |
| `fn`      | (`error`) => `F` |

###### Returns

[`Result`](#result)&lt;`T`, `F`&gt;

##### match()

```ts
match<R>(pattern): R;
```

Defined in: [result.ts:103](https://github.com/btravers/temporal-contract/blob/5120f893a4e07cf022d0192f94ff01e2d170fcf9/packages/boxed/src/result.ts#L103)

###### Type Parameters

| Type Parameter |
| -------------- |
| `R`            |

###### Parameters

| Parameter       | Type                                                     |
| --------------- | -------------------------------------------------------- |
| `pattern`       | \{ `Error`: (`error`) => `R`; `Ok`: (`value`) => `R`; \} |
| `pattern.Error` | (`error`) => `R`                                         |
| `pattern.Ok`    | (`value`) => `R`                                         |

###### Returns

`R`

##### toOption()

```ts
toOption(): Option<T>;
```

Defined in: [result.ts:107](https://github.com/btravers/temporal-contract/blob/5120f893a4e07cf022d0192f94ff01e2d170fcf9/packages/boxed/src/result.ts#L107)

###### Returns

[`Option`](#option)&lt;`T`&gt;

---

### Future&lt;T&gt;

Defined in: [future.ts:8](https://github.com/btravers/temporal-contract/blob/5120f893a4e07cf022d0192f94ff01e2d170fcf9/packages/boxed/src/future.ts#L8)

Future type representing an asynchronous computation
This is a custom implementation compatible with Temporal workflows

#### Type Parameters

| Type Parameter |
| -------------- |
| `T`            |

#### Implements

- `Promise`&lt;`T`&gt;

#### Properties

| Property                                 | Modifier   | Type       | Default value | Defined in                                                                                                                                   |
| ---------------------------------------- | ---------- | ---------- | ------------- | -------------------------------------------------------------------------------------------------------------------------------------------- |
| <a id="tostringtag"></a> `[toStringTag]` | `readonly` | `"Future"` | `"Future"`    | [future.ts:12](https://github.com/btravers/temporal-contract/blob/5120f893a4e07cf022d0192f94ff01e2d170fcf9/packages/boxed/src/future.ts#L12) |

#### Methods

##### catch()

```ts
catch<TResult>(onRejected?): Promise<T | TResult>;
```

Defined in: [future.ts:171](https://github.com/btravers/temporal-contract/blob/5120f893a4e07cf022d0192f94ff01e2d170fcf9/packages/boxed/src/future.ts#L171)

Attaches a callback for only the rejection of the Promise.

###### Type Parameters

| Type Parameter | Default type |
| -------------- | ------------ |
| `TResult`      | `never`      |

###### Parameters

| Parameter     | Type                                                                |
| ------------- | ------------------------------------------------------------------- |
| `onRejected?` | `null` \| (`reason`) => `TResult` \| `PromiseLike`&lt;`TResult`&gt; |

###### Returns

`Promise`&lt;`T` \| `TResult`&gt;

A Promise for the completion of the callback.

###### Implementation of

```ts
Promise.catch;
```

##### finally()

```ts
finally(onFinally?): Promise<T>;
```

Defined in: [future.ts:177](https://github.com/btravers/temporal-contract/blob/5120f893a4e07cf022d0192f94ff01e2d170fcf9/packages/boxed/src/future.ts#L177)

Attaches a callback that is invoked when the Promise is settled (fulfilled or rejected). The
resolved value cannot be modified from the callback.

###### Parameters

| Parameter    | Type                   |
| ------------ | ---------------------- |
| `onFinally?` | `null` \| () => `void` |

###### Returns

`Promise`&lt;`T`&gt;

A Promise for the completion of the callback.

###### Implementation of

```ts
Promise.finally;
```

##### flatMap()

```ts
flatMap<U>(fn): Future<U>;
```

Defined in: [future.ts:77](https://github.com/btravers/temporal-contract/blob/5120f893a4e07cf022d0192f94ff01e2d170fcf9/packages/boxed/src/future.ts#L77)

FlatMap the result of the Future

###### Type Parameters

| Type Parameter |
| -------------- |
| `U`            |

###### Parameters

| Parameter | Type                                        |
| --------- | ------------------------------------------- |
| `fn`      | (`value`) => [`Future`](#future)&lt;`U`&gt; |

###### Returns

[`Future`](#future)&lt;`U`&gt;

##### flatMapOk()

```ts
flatMapOk<V, E, U>(this, fn): Future<Result<U, E>>;
```

Defined in: [future.ts:108](https://github.com/btravers/temporal-contract/blob/5120f893a4e07cf022d0192f94ff01e2d170fcf9/packages/boxed/src/future.ts#L108)

FlatMap over a Result within a Future

###### Type Parameters

| Type Parameter |
| -------------- |
| `V`            |
| `E`            |
| `U`            |

###### Parameters

| Parameter | Type                                                                        |
| --------- | --------------------------------------------------------------------------- |
| `this`    | [`Future`](#future)&lt;[`Result`](#result)&lt;`V`, `E`&gt;&gt;              |
| `fn`      | (`value`) => [`Future`](#future)&lt;[`Result`](#result)&lt;`U`, `E`&gt;&gt; |

###### Returns

[`Future`](#future)&lt;[`Result`](#result)&lt;`U`, `E`&gt;&gt;

##### map()

```ts
map<U>(fn): Future<U>;
```

Defined in: [future.ts:70](https://github.com/btravers/temporal-contract/blob/5120f893a4e07cf022d0192f94ff01e2d170fcf9/packages/boxed/src/future.ts#L70)

Map the result of the Future

###### Type Parameters

| Type Parameter |
| -------------- |
| `U`            |

###### Parameters

| Parameter | Type             |
| --------- | ---------------- |
| `fn`      | (`value`) => `U` |

###### Returns

[`Future`](#future)&lt;`U`&gt;

##### mapError()

```ts
mapError<V, E, F>(this, fn): Future<Result<V, F>>;
```

Defined in: [future.ts:96](https://github.com/btravers/temporal-contract/blob/5120f893a4e07cf022d0192f94ff01e2d170fcf9/packages/boxed/src/future.ts#L96)

Map over an error in a Result within a Future

###### Type Parameters

| Type Parameter |
| -------------- |
| `V`            |
| `E`            |
| `F`            |

###### Parameters

| Parameter | Type                                                           |
| --------- | -------------------------------------------------------------- |
| `this`    | [`Future`](#future)&lt;[`Result`](#result)&lt;`V`, `E`&gt;&gt; |
| `fn`      | (`error`) => `F`                                               |

###### Returns

[`Future`](#future)&lt;[`Result`](#result)&lt;`V`, `F`&gt;&gt;

##### mapOk()

```ts
mapOk<V, U, E>(this, fn): Future<Result<U, E>>;
```

Defined in: [future.ts:84](https://github.com/btravers/temporal-contract/blob/5120f893a4e07cf022d0192f94ff01e2d170fcf9/packages/boxed/src/future.ts#L84)

Map over a Result within a Future

###### Type Parameters

| Type Parameter |
| -------------- |
| `V`            |
| `U`            |
| `E`            |

###### Parameters

| Parameter | Type                                                           |
| --------- | -------------------------------------------------------------- |
| `this`    | [`Future`](#future)&lt;[`Result`](#result)&lt;`V`, `E`&gt;&gt; |
| `fn`      | (`value`) => `U`                                               |

###### Returns

[`Future`](#future)&lt;[`Result`](#result)&lt;`U`, `E`&gt;&gt;

##### tap()

```ts
tap(fn): Future<T>;
```

Defined in: [future.ts:125](https://github.com/btravers/temporal-contract/blob/5120f893a4e07cf022d0192f94ff01e2d170fcf9/packages/boxed/src/future.ts#L125)

Tap into the Future value without changing it

###### Parameters

| Parameter | Type                |
| --------- | ------------------- |
| `fn`      | (`value`) => `void` |

###### Returns

[`Future`](#future)&lt;`T`&gt;

##### tapError()

```ts
tapError<V, E>(this, fn): Future<Result<V, E>>;
```

Defined in: [future.ts:146](https://github.com/btravers/temporal-contract/blob/5120f893a4e07cf022d0192f94ff01e2d170fcf9/packages/boxed/src/future.ts#L146)

Tap into Error values in a Result

###### Type Parameters

| Type Parameter |
| -------------- |
| `V`            |
| `E`            |

###### Parameters

| Parameter | Type                                                           |
| --------- | -------------------------------------------------------------- |
| `this`    | [`Future`](#future)&lt;[`Result`](#result)&lt;`V`, `E`&gt;&gt; |
| `fn`      | (`error`) => `void`                                            |

###### Returns

[`Future`](#future)&lt;[`Result`](#result)&lt;`V`, `E`&gt;&gt;

##### tapOk()

```ts
tapOk<V, E>(this, fn): Future<Result<V, E>>;
```

Defined in: [future.ts:135](https://github.com/btravers/temporal-contract/blob/5120f893a4e07cf022d0192f94ff01e2d170fcf9/packages/boxed/src/future.ts#L135)

Tap into Ok values in a Result

###### Type Parameters

| Type Parameter |
| -------------- |
| `V`            |
| `E`            |

###### Parameters

| Parameter | Type                                                           |
| --------- | -------------------------------------------------------------- |
| `this`    | [`Future`](#future)&lt;[`Result`](#result)&lt;`V`, `E`&gt;&gt; |
| `fn`      | (`value`) => `void`                                            |

###### Returns

[`Future`](#future)&lt;[`Result`](#result)&lt;`V`, `E`&gt;&gt;

##### then()

```ts
then<TResult1, TResult2>(onFulfilled?, onRejected?): Promise<TResult1 | TResult2>;
```

Defined in: [future.ts:164](https://github.com/btravers/temporal-contract/blob/5120f893a4e07cf022d0192f94ff01e2d170fcf9/packages/boxed/src/future.ts#L164)

Attaches callbacks for the resolution and/or rejection of the Promise.

###### Type Parameters

| Type Parameter | Default type |
| -------------- | ------------ |
| `TResult1`     | `T`          |
| `TResult2`     | `never`      |

###### Parameters

| Parameter      | Type                                                                  |
| -------------- | --------------------------------------------------------------------- |
| `onFulfilled?` | `null` \| (`value`) => `TResult1` \| `PromiseLike`&lt;`TResult1`&gt;  |
| `onRejected?`  | `null` \| (`reason`) => `TResult2` \| `PromiseLike`&lt;`TResult2`&gt; |

###### Returns

`Promise`&lt;`TResult1` \| `TResult2`&gt;

A Promise for the completion of which ever callback is executed.

###### Implementation of

```ts
Promise.then;
```

##### toPromise()

```ts
toPromise(): Promise<T>;
```

Defined in: [future.ts:157](https://github.com/btravers/temporal-contract/blob/5120f893a4e07cf022d0192f94ff01e2d170fcf9/packages/boxed/src/future.ts#L157)

Convert to a Promise (for await)

###### Returns

`Promise`&lt;`T`&gt;

##### all()

```ts
static all<T>(futures): Future<T[]>;
```

Defined in: [future.ts:56](https://github.com/btravers/temporal-contract/blob/5120f893a4e07cf022d0192f94ff01e2d170fcf9/packages/boxed/src/future.ts#L56)

Combine multiple Futures into one

###### Type Parameters

| Type Parameter |
| -------------- |
| `T`            |

###### Parameters

| Parameter | Type                             |
| --------- | -------------------------------- |
| `futures` | [`Future`](#future)&lt;`T`&gt;[] |

###### Returns

[`Future`](#future)&lt;`T`[]&gt;

##### fromPromise()

```ts
static fromPromise<T>(promise): Future<Result<T, unknown>>;
```

Defined in: [future.ts:38](https://github.com/btravers/temporal-contract/blob/5120f893a4e07cf022d0192f94ff01e2d170fcf9/packages/boxed/src/future.ts#L38)

Create a Future from a Promise

###### Type Parameters

| Type Parameter |
| -------------- |
| `T`            |

###### Parameters

| Parameter | Type                 |
| --------- | -------------------- |
| `promise` | `Promise`&lt;`T`&gt; |

###### Returns

[`Future`](#future)&lt;[`Result`](#result)&lt;`T`, `unknown`&gt;&gt;

##### make()

```ts
static make<T>(executor): Future<T>;
```

Defined in: [future.ts:21](https://github.com/btravers/temporal-contract/blob/5120f893a4e07cf022d0192f94ff01e2d170fcf9/packages/boxed/src/future.ts#L21)

Create a Future from an executor function

###### Type Parameters

| Type Parameter |
| -------------- |
| `T`            |

###### Parameters

| Parameter  | Type                  |
| ---------- | --------------------- |
| `executor` | (`resolve`) => `void` |

###### Returns

[`Future`](#future)&lt;`T`&gt;

##### race()

```ts
static race<T>(futures): Future<T>;
```

Defined in: [future.ts:63](https://github.com/btravers/temporal-contract/blob/5120f893a4e07cf022d0192f94ff01e2d170fcf9/packages/boxed/src/future.ts#L63)

Race multiple Futures

###### Type Parameters

| Type Parameter |
| -------------- |
| `T`            |

###### Parameters

| Parameter | Type                             |
| --------- | -------------------------------- |
| `futures` | [`Future`](#future)&lt;`T`&gt;[] |

###### Returns

[`Future`](#future)&lt;`T`&gt;

##### reject()

```ts
static reject<T>(error): Future<T>;
```

Defined in: [future.ts:49](https://github.com/btravers/temporal-contract/blob/5120f893a4e07cf022d0192f94ff01e2d170fcf9/packages/boxed/src/future.ts#L49)

Create a rejected Future

###### Type Parameters

| Type Parameter | Default type |
| -------------- | ------------ |
| `T`            | `never`      |

###### Parameters

| Parameter | Type      |
| --------- | --------- |
| `error`   | `unknown` |

###### Returns

[`Future`](#future)&lt;`T`&gt;

##### value()

```ts
static value<T>(value): Future<T>;
```

Defined in: [future.ts:31](https://github.com/btravers/temporal-contract/blob/5120f893a4e07cf022d0192f94ff01e2d170fcf9/packages/boxed/src/future.ts#L31)

Create a Future from a value

###### Type Parameters

| Type Parameter |
| -------------- |
| `T`            |

###### Parameters

| Parameter | Type |
| --------- | ---- |
| `value`   | `T`  |

###### Returns

[`Future`](#future)&lt;`T`&gt;

---

### Ok&lt;T, E&gt;

Defined in: [result.ts:11](https://github.com/btravers/temporal-contract/blob/5120f893a4e07cf022d0192f94ff01e2d170fcf9/packages/boxed/src/result.ts#L11)

Ok variant representing a successful result

#### Type Parameters

| Type Parameter |
| -------------- |
| `T`            |
| `E`            |

#### Constructors

##### Constructor

```ts
new Ok<T, E>(value): Ok<T, E>;
```

Defined in: [result.ts:15](https://github.com/btravers/temporal-contract/blob/5120f893a4e07cf022d0192f94ff01e2d170fcf9/packages/boxed/src/result.ts#L15)

###### Parameters

| Parameter | Type |
| --------- | ---- |
| `value`   | `T`  |

###### Returns

[`Ok`](#ok)&lt;`T`, `E`&gt;

#### Properties

| Property                     | Modifier   | Type   | Defined in                                                                                                                                   |
| ---------------------------- | ---------- | ------ | -------------------------------------------------------------------------------------------------------------------------------------------- |
| <a id="tag-1"></a> `tag`     | `readonly` | `"Ok"` | [result.ts:12](https://github.com/btravers/temporal-contract/blob/5120f893a4e07cf022d0192f94ff01e2d170fcf9/packages/boxed/src/result.ts#L12) |
| <a id="value-2"></a> `value` | `readonly` | `T`    | [result.ts:13](https://github.com/btravers/temporal-contract/blob/5120f893a4e07cf022d0192f94ff01e2d170fcf9/packages/boxed/src/result.ts#L13) |

#### Methods

##### flatMap()

```ts
flatMap<U>(fn): Result<U, E>;
```

Defined in: [result.ts:35](https://github.com/btravers/temporal-contract/blob/5120f893a4e07cf022d0192f94ff01e2d170fcf9/packages/boxed/src/result.ts#L35)

###### Type Parameters

| Type Parameter |
| -------------- |
| `U`            |

###### Parameters

| Parameter | Type                                             |
| --------- | ------------------------------------------------ |
| `fn`      | (`value`) => [`Result`](#result)&lt;`U`, `E`&gt; |

###### Returns

[`Result`](#result)&lt;`U`, `E`&gt;

##### flatMapOk()

```ts
flatMapOk<U>(fn): Result<U, E>;
```

Defined in: [result.ts:39](https://github.com/btravers/temporal-contract/blob/5120f893a4e07cf022d0192f94ff01e2d170fcf9/packages/boxed/src/result.ts#L39)

###### Type Parameters

| Type Parameter |
| -------------- |
| `U`            |

###### Parameters

| Parameter | Type                                             |
| --------- | ------------------------------------------------ |
| `fn`      | (`value`) => [`Result`](#result)&lt;`U`, `E`&gt; |

###### Returns

[`Result`](#result)&lt;`U`, `E`&gt;

##### getOr()

```ts
getOr(_defaultValue): T;
```

Defined in: [result.ts:43](https://github.com/btravers/temporal-contract/blob/5120f893a4e07cf022d0192f94ff01e2d170fcf9/packages/boxed/src/result.ts#L43)

###### Parameters

| Parameter       | Type |
| --------------- | ---- |
| `_defaultValue` | `T`  |

###### Returns

`T`

##### getWithDefault()

```ts
getWithDefault(_defaultValue): T;
```

Defined in: [result.ts:47](https://github.com/btravers/temporal-contract/blob/5120f893a4e07cf022d0192f94ff01e2d170fcf9/packages/boxed/src/result.ts#L47)

###### Parameters

| Parameter       | Type |
| --------------- | ---- |
| `_defaultValue` | `T`  |

###### Returns

`T`

##### isError()

```ts
isError(): this is Error<T, E>;
```

Defined in: [result.ts:23](https://github.com/btravers/temporal-contract/blob/5120f893a4e07cf022d0192f94ff01e2d170fcf9/packages/boxed/src/result.ts#L23)

###### Returns

`this is Error<T, E>`

##### isOk()

```ts
isOk(): this is Ok<T, E>;
```

Defined in: [result.ts:19](https://github.com/btravers/temporal-contract/blob/5120f893a4e07cf022d0192f94ff01e2d170fcf9/packages/boxed/src/result.ts#L19)

###### Returns

`this is Ok<T, E>`

##### map()

```ts
map<U>(fn): Result<U, E>;
```

Defined in: [result.ts:27](https://github.com/btravers/temporal-contract/blob/5120f893a4e07cf022d0192f94ff01e2d170fcf9/packages/boxed/src/result.ts#L27)

###### Type Parameters

| Type Parameter |
| -------------- |
| `U`            |

###### Parameters

| Parameter | Type             |
| --------- | ---------------- |
| `fn`      | (`value`) => `U` |

###### Returns

[`Result`](#result)&lt;`U`, `E`&gt;

##### mapError()

```ts
mapError<F>(_fn): Result<T, F>;
```

Defined in: [result.ts:31](https://github.com/btravers/temporal-contract/blob/5120f893a4e07cf022d0192f94ff01e2d170fcf9/packages/boxed/src/result.ts#L31)

###### Type Parameters

| Type Parameter |
| -------------- |
| `F`            |

###### Parameters

| Parameter | Type             |
| --------- | ---------------- |
| `_fn`     | (`error`) => `F` |

###### Returns

[`Result`](#result)&lt;`T`, `F`&gt;

##### match()

```ts
match<R>(pattern): R;
```

Defined in: [result.ts:51](https://github.com/btravers/temporal-contract/blob/5120f893a4e07cf022d0192f94ff01e2d170fcf9/packages/boxed/src/result.ts#L51)

###### Type Parameters

| Type Parameter |
| -------------- |
| `R`            |

###### Parameters

| Parameter       | Type                                                     |
| --------------- | -------------------------------------------------------- |
| `pattern`       | \{ `Error`: (`error`) => `R`; `Ok`: (`value`) => `R`; \} |
| `pattern.Error` | (`error`) => `R`                                         |
| `pattern.Ok`    | (`value`) => `R`                                         |

###### Returns

`R`

##### toOption()

```ts
toOption(): Option<T>;
```

Defined in: [result.ts:55](https://github.com/btravers/temporal-contract/blob/5120f893a4e07cf022d0192f94ff01e2d170fcf9/packages/boxed/src/result.ts#L55)

###### Returns

[`Option`](#option)&lt;`T`&gt;

## Type Aliases

### Option&lt;T&gt;

```ts
type Option<T> =
  | {
      tag: "Some";
      value: T;
    }
  | {
      tag: "None";
    };
```

Defined in: [result.ts:115](https://github.com/btravers/temporal-contract/blob/5120f893a4e07cf022d0192f94ff01e2d170fcf9/packages/boxed/src/result.ts#L115)

Option type for Result.toOption()

#### Type Parameters

| Type Parameter |
| -------------- |
| `T`            |

---

### Result&lt;T, E&gt;

```ts
type Result<T, E> = Ok<T, E> | Error<T, E>;
```

Defined in: [result.ts:6](https://github.com/btravers/temporal-contract/blob/5120f893a4e07cf022d0192f94ff01e2d170fcf9/packages/boxed/src/result.ts#L6)

Result type representing either a successful value (Ok) or an error (Error)
This is a custom implementation compatible with Temporal workflows

#### Type Parameters

| Type Parameter |
| -------------- |
| `T`            |
| `E`            |

## Variables

### Result

```ts
Result: object;
```

Defined in: [result.ts:6](https://github.com/btravers/temporal-contract/blob/5120f893a4e07cf022d0192f94ff01e2d170fcf9/packages/boxed/src/result.ts#L6)

Result namespace with factory methods

#### Type declaration

| Name                                         | Type                                                                 | Defined in                                                                                                                                     |
| -------------------------------------------- | -------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------- |
| <a id="all-2"></a> `all()`                   | &lt;`T`, `E`&gt;(`results`) => [`Result`](#result)&lt;`T`[], `E`&gt; | [result.ts:135](https://github.com/btravers/temporal-contract/blob/5120f893a4e07cf022d0192f94ff01e2d170fcf9/packages/boxed/src/result.ts#L135) |
| <a id="error-2"></a> `Error()`               | &lt;`T`, `E`&gt;(`error`) => [`Result`](#result)&lt;`T`, `E`&gt;     | [result.ts:122](https://github.com/btravers/temporal-contract/blob/5120f893a4e07cf022d0192f94ff01e2d170fcf9/packages/boxed/src/result.ts#L122) |
| <a id="fromexecution"></a> `fromExecution()` | &lt;`T`, `E`&gt;(`fn`) => [`Result`](#result)&lt;`T`, `E`&gt;        | [result.ts:127](https://github.com/btravers/temporal-contract/blob/5120f893a4e07cf022d0192f94ff01e2d170fcf9/packages/boxed/src/result.ts#L127) |
| <a id="iserror-4"></a> `isError()`           | &lt;`T`, `E`&gt;(`result`) => `result is Error<T, E>`                | [result.ts:125](https://github.com/btravers/temporal-contract/blob/5120f893a4e07cf022d0192f94ff01e2d170fcf9/packages/boxed/src/result.ts#L125) |
| <a id="isok-4"></a> `isOk()`                 | &lt;`T`, `E`&gt;(`result`) => `result is Ok<T, E>`                   | [result.ts:124](https://github.com/btravers/temporal-contract/blob/5120f893a4e07cf022d0192f94ff01e2d170fcf9/packages/boxed/src/result.ts#L124) |
| <a id="ok-1"></a> `Ok()`                     | &lt;`T`, `E`&gt;(`value`) => [`Result`](#result)&lt;`T`, `E`&gt;     | [result.ts:121](https://github.com/btravers/temporal-contract/blob/5120f893a4e07cf022d0192f94ff01e2d170fcf9/packages/boxed/src/result.ts#L121) |
