# @temporal-contract/worker-nestjs

## 0.2.0

### Minor Changes

- Align project structure with amqp-contract and address code quality issues across packages.

### Patch Changes

- Updated dependencies
  - @temporal-contract/contract@0.2.0
  - @temporal-contract/worker@0.2.0

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
  - @temporal-contract/worker@0.1.0

## 0.0.2

### Patch Changes

- Updated dependencies
  - @temporal-contract/worker@0.0.7
  - @temporal-contract/contract@0.0.7
