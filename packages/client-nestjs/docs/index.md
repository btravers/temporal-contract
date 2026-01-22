**@temporal-contract/client-nestjs**

---

# @temporal-contract/client-nestjs

## Classes

### TemporalClientModule

Defined in: [packages/client-nestjs/src/temporal-client.module.ts:28](https://github.com/btravers/temporal-contract/blob/5120f893a4e07cf022d0192f94ff01e2d170fcf9/packages/client-nestjs/src/temporal-client.module.ts#L28)

Temporal client module for NestJS integration

Provides a declarative way to define Temporal clients with type safety.

#### Example

```typescript
@Module({
  imports: [
    TemporalClientModule.forRoot({
      contract: myContract,
      client: temporalClient,
    }),
  ],
})
export class AppModule {}
```

#### Extends

- `ConfigurableModuleClass`

#### Indexable

```ts
[key: string]: any
```

#### Constructors

##### Constructor

```ts
new TemporalClientModule(): TemporalClientModule;
```

Defined in: node_modules/.pnpm/@nestjs+common@11.1.12_reflect-metadata@0.2.2_rxjs@7.8.2/node_modules/@nestjs/common/module-utils/interfaces/configurable-module-cls.interface.d.ts:12

###### Returns

[`TemporalClientModule`](#temporalclientmodule)

###### Inherited from

```ts
ConfigurableModuleClass.constructor;
```

#### Properties

| Property                                 | Modifier | Type                           | Inherited from                         | Defined in |
| ---------------------------------------- | -------- | ------------------------------ | -------------------------------------- | ---------- |
| <a id="forroot"></a> `forRoot`           | `static` | (`options`) => `DynamicModule` | `ConfigurableModuleClass.forRoot`      |            |
| <a id="forrootasync"></a> `forRootAsync` | `static` | (`options`) => `DynamicModule` | `ConfigurableModuleClass.forRootAsync` |            |

---

### TemporalClientService&lt;TContract&gt;

Defined in: [packages/client-nestjs/src/temporal-client.service.ts:11](https://github.com/btravers/temporal-contract/blob/5120f893a4e07cf022d0192f94ff01e2d170fcf9/packages/client-nestjs/src/temporal-client.service.ts#L11)

Service managing the Temporal typed client lifecycle

#### Type Parameters

| Type Parameter                             | Default type         |
| ------------------------------------------ | -------------------- |
| `TContract` _extends_ `ContractDefinition` | `ContractDefinition` |

#### Implements

- `OnModuleDestroy`

#### Constructors

##### Constructor

```ts
new TemporalClientService<TContract>(options): TemporalClientService<TContract>;
```

Defined in: [packages/client-nestjs/src/temporal-client.service.ts:17](https://github.com/btravers/temporal-contract/blob/5120f893a4e07cf022d0192f94ff01e2d170fcf9/packages/client-nestjs/src/temporal-client.service.ts#L17)

###### Parameters

| Parameter | Type                                                                             |
| --------- | -------------------------------------------------------------------------------- |
| `options` | [`TemporalClientModuleOptions`](#temporalclientmoduleoptions)&lt;`TContract`&gt; |

###### Returns

[`TemporalClientService`](#temporalclientservice)&lt;`TContract`&gt;

#### Methods

##### getClient()

```ts
getClient(): TypedClient<TContract>;
```

Defined in: [packages/client-nestjs/src/temporal-client.service.ts:38](https://github.com/btravers/temporal-contract/blob/5120f893a4e07cf022d0192f94ff01e2d170fcf9/packages/client-nestjs/src/temporal-client.service.ts#L38)

Get the typed client instance

###### Returns

`TypedClient`&lt;`TContract`&gt;

##### onModuleDestroy()

```ts
onModuleDestroy(): Promise<void>;
```

Defined in: [packages/client-nestjs/src/temporal-client.service.ts:29](https://github.com/btravers/temporal-contract/blob/5120f893a4e07cf022d0192f94ff01e2d170fcf9/packages/client-nestjs/src/temporal-client.service.ts#L29)

Clean up resources on module destruction

###### Returns

`Promise`&lt;`void`&gt;

###### Implementation of

```ts
OnModuleDestroy.onModuleDestroy;
```

## Interfaces

### TemporalClientModuleOptions&lt;TContract&gt;

Defined in: [packages/client-nestjs/src/interfaces.ts:7](https://github.com/btravers/temporal-contract/blob/5120f893a4e07cf022d0192f94ff01e2d170fcf9/packages/client-nestjs/src/interfaces.ts#L7)

Options for configuring the Temporal client module

#### Type Parameters

| Type Parameter                             | Default type         |
| ------------------------------------------ | -------------------- |
| `TContract` _extends_ `ContractDefinition` | `ContractDefinition` |

#### Properties

| Property                         | Type        | Description                                             | Defined in                                                                                                                                                                              |
| -------------------------------- | ----------- | ------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| <a id="client"></a> `client`     | `Client`    | Temporal client instance or configuration to create one | [packages/client-nestjs/src/interfaces.ts:18](https://github.com/btravers/temporal-contract/blob/5120f893a4e07cf022d0192f94ff01e2d170fcf9/packages/client-nestjs/src/interfaces.ts#L18) |
| <a id="contract"></a> `contract` | `TContract` | The contract definition for this client                 | [packages/client-nestjs/src/interfaces.ts:13](https://github.com/btravers/temporal-contract/blob/5120f893a4e07cf022d0192f94ff01e2d170fcf9/packages/client-nestjs/src/interfaces.ts#L13) |
