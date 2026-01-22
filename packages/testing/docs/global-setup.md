[**@temporal-contract/testing**](index.md)

---

[@temporal-contract/testing](index.md) / global-setup

# global-setup

## Functions

### default()

```ts
function default(__namedParameters): Promise<() => Promise<void>>;
```

Defined in: [packages/testing/src/global-setup.ts:15](https://github.com/btravers/temporal-contract/blob/5120f893a4e07cf022d0192f94ff01e2d170fcf9/packages/testing/src/global-setup.ts#L15)

Setup function for Vitest globalSetup
Starts a Temporal server container before all tests

#### Parameters

| Parameter           | Type          |
| ------------------- | ------------- |
| `__namedParameters` | `TestProject` |

#### Returns

`Promise`&lt;() => `Promise`&lt;`void`&gt;&gt;
