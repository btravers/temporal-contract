# Roadmap

## Current Status (v0.0.1)

✅ **Core functionality implemented**
- Type-safe contract definitions
- Workflow implementation with validation
- Activity implementation with validation
- Typed client for workflow consumption
- Zod validation for inputs/outputs
- Monorepo structure with Turborepo + pnpm

## Phase 1: Standard Schema Support (v0.1.0)

### Goal
Support multiple validation libraries through [Standard Schema](https://github.com/standard-schema/standard-schema) specification.

### Tasks
- [ ] Add Standard Schema adapter layer
- [ ] Support Zod (existing)
- [ ] Support Valibot
- [ ] Support Yup
- [ ] Support ArkType
- [ ] Update documentation with examples for each library
- [ ] Add migration guide from Zod-only

### Benefits
- Users can choose their preferred validation library
- Better ecosystem compatibility
- More flexible contract definitions

### Example
```typescript
// With Zod (current)
import { z } from 'zod';
const schema = z.object({ name: z.string() });

// With Valibot (future)
import * as v from 'valibot';
const schema = v.object({ name: v.string() });

// With Yup (future)
import * as yup from 'yup';
const schema = yup.object({ name: yup.string() });
```

## Phase 2: Enhanced Features (v0.2.0)

### Workflow Signals & Queries
- [ ] Type-safe workflow signals
- [ ] Type-safe workflow queries
- [ ] Signal/query definitions in contracts

### Advanced Options
- [ ] Custom retry policies per workflow/activity
- [ ] Timeout configurations in contract
- [ ] Search attributes support
- [ ] Workflow versioning support

### Developer Experience
- [ ] CLI tool for generating contracts
- [ ] VS Code extension for contract validation
- [ ] Better error messages
- [ ] Detailed debugging information

## Phase 3: Testing & Quality (v0.3.0)

### Testing Utilities
- [ ] Mock client for testing
- [ ] Test utilities for workflows
- [ ] Test utilities for activities
- [ ] Integration testing helpers

### Documentation
- [ ] Interactive documentation site
- [ ] More comprehensive examples
- [ ] Video tutorials
- [ ] Best practices guide

### Quality Assurance
- [ ] Unit tests for all packages
- [ ] Integration tests
- [ ] E2E tests with real Temporal server
- [ ] Performance benchmarks

## Phase 4: Ecosystem Integration (v0.4.0)

### Framework Integrations
- [ ] Next.js integration guide
- [ ] Express/Fastify middleware
- [ ] tRPC integration example
- [ ] NestJS module

### Observability
- [ ] OpenTelemetry integration
- [ ] Structured logging support
- [ ] Metrics collection
- [ ] Distributed tracing

### Developer Tools
- [ ] Contract visualization tool
- [ ] Workflow diagram generator
- [ ] Contract versioning system
- [ ] Migration tools

## Future Ideas (Backlog)

### Advanced Type Features
- Conditional workflows based on input
- Union types for polymorphic workflows
- Generic workflow definitions
- Workflow composition patterns

### Production Features
- Rate limiting
- Circuit breakers
- Canary deployments
- A/B testing support

### Community
- Plugin system
- Community templates
- Workflow marketplace
- Best practices repository

## Contributing

Want to help with any of these features? Check out [CONTRIBUTING.md](./CONTRIBUTING.md) for guidelines!

## Feedback

Have ideas for the roadmap? Open an issue or discussion on GitHub!
