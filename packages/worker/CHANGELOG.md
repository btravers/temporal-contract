# @temporal-contract/worker

## 0.2.0

### Minor Changes

- Align project structure with amqp-contract and address code quality issues across packages.

### Patch Changes

- Updated dependencies
  - @temporal-contract/contract@0.2.0
  - @temporal-contract/boxed@0.2.0

## 0.1.0

### Minor Changes

- ## Breaking Changes
  - Removed unimplemented Nexus types from public API (`defineNexusOperation`, `defineNexusService`, and related types). These were proof-of-concept exports that were not yet functional. The planned Nexus API design is documented at https://btravers.github.io/temporal-contract/guide/nexus-integration

  ## Improvements

  ### Documentation
  - Enhanced documentation site with comprehensive SEO (meta tags, JSON-LD structured data, sitemap, canonical URLs)
  - Added "Why temporal-contract?" guide explaining the value proposition
  - Added "Troubleshooting" guide with common issues and solutions
  - Simplified homepage with cleaner feature presentation and quick example
  - Reorganized sidebar navigation to match industry patterns

  ### Package Fixes
  - **@temporal-contract/worker-nestjs**: Updated peer dependencies from NestJS ^10 to ^11 for consistency with client-nestjs
  - **@temporal-contract/worker-nestjs**: Changed hardcoded dependency versions to use pnpm catalog references

### Patch Changes

- Updated dependencies
  - @temporal-contract/contract@0.1.0
  - @temporal-contract/boxed@0.1.0

## 0.0.7

### Patch Changes

- Replace @temporal-contract/boxed with @swan-io/boxed in client and activities. The @temporal-contract/boxed package now focuses on Temporal-compatible implementations for workflows while @swan-io/boxed is used for client-side and activity code.
- Updated dependencies
  - @temporal-contract/boxed@0.0.7
  - @temporal-contract/contract@0.0.7

## 0.0.6

### Patch Changes

- Release version 0.0.6
- Updated dependencies
  - @temporal-contract/contract@0.0.6
  - @temporal-contract/boxed@0.0.6

## 0.0.5

### Patch Changes

- Release version 0.0.5 - Add @temporal-contract/boxed to releases
- Updated dependencies
  - @temporal-contract/contract@0.0.5
  - @temporal-contract/boxed@0.0.5

## 0.0.4

### Patch Changes

- Merge client and worker boxed implementations
- Updated dependencies
  - @temporal-contract/contract@0.0.4

## 0.0.3

### Patch Changes

- Release version 0.0.3
- Updated dependencies
  - @temporal-contract/contract@0.0.3

## 0.0.2

### Patch Changes

- Release version 0.0.2
- Updated dependencies
  - @temporal-contract/contract@0.0.2
