# @temporal-contract/tsconfig

Shared TypeScript configuration for all temporal-contract packages and samples.

## Usage

### For Packages

In your package's `tsconfig.json`:

```json
{
  "extends": "@temporal-contract/tsconfig/base.json"
}
```

### For Samples

In your sample's `tsconfig.json`:

```json
{
  "extends": "@temporal-contract/tsconfig/sample.json"
}
```

## Configurations

### `common.json`

Shared strict configuration used by both base and sample:
- **Module:** Node16 with ES modules
- **Strict mode:** Full strict + additional strict checks
  - `noUncheckedIndexedAccess`: Indexed access returns `T | undefined`
  - `noImplicitOverride`: Requires explicit `override` keyword
  - `noFallthroughCasesInSwitch`: Prevents switch fallthrough bugs
  - `noUnusedLocals`: Reports unused local variables
  - `noUnusedParameters`: Reports unused function parameters
  - `exactOptionalPropertyTypes`: Distinguishes `undefined` from missing properties
  - `noPropertyAccessFromIndexSignature`: Requires bracket notation for index signatures
  - `noImplicitReturns`: All code paths must return a value
  - `allowUnusedLabels`: false
  - `allowUnreachableCode`: false

### `base.json`

Extends `common.json` for packages:
- **Target:** ES2020
- **Declaration files:** Generated for publishing

### `sample.json`

Extends `common.json` for sample applications:
- **Target:** ES2022 (more modern features)
- **No declaration files:** Samples don't need type declarations

## Overriding Options

You can override any option in your local `tsconfig.json`:

```json
{
  "extends": "@temporal-contract/tsconfig/base.json",
  "compilerOptions": {
    "outDir": "./build",
    "rootDir": "./lib"
  }
}
```
