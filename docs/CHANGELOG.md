# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

## [0.0.1] - 2025-12-07

### Added

- Initial release of temporal-contract
- `@temporal-contract/core` - Core types and utilities
- `@temporal-contract/contract` - Contract builder for defining workflows and activities
- `@temporal-contract/worker` - Utilities for implementing workflows and activities
- `@temporal-contract/client` - Client for consuming workflows
- Monorepo structure with Turborepo and pnpm
- Zod validation for inputs and outputs
- Full TypeScript type inference
- Comprehensive examples
- Documentation for all packages

### Features

- Type-safe contract definitions
- Automatic input/output validation
- Typed activity proxies in workflows
- Autocomplete for workflow names and parameters
- End-to-end type safety from contract to client

[Unreleased]: https://github.com/btravers/temporal-contract/compare/v0.0.1...HEAD
[0.0.1]: https://github.com/btravers/temporal-contract/releases/tag/v0.0.1
