# GitHub Copilot Instructions for temporal-contract

This document provides AI-assisted code review rules and coding guidelines for the temporal-contract project. These rules help maintain code quality and serve as documentation for all contributors.

## Table of Contents

1. [Project Overview](#project-overview)
2. [TypeScript & Type Safety](#typescript--type-safety)
3. [Code Style & Formatting](#code-style--formatting)
4. [Monorepo Structure](#monorepo-structure)
5. [Temporal.io Patterns](#temporalio-patterns)
6. [Error Handling](#error-handling)
7. [Testing Requirements](#testing-requirements)
8. [Documentation Standards](#documentation-standards)
9. [Performance & Best Practices](#performance--best-practices)
10. [Common Review Issues](#common-review-issues)

---

## Project Overview

**temporal-contract** is a type-safe contract system for Temporal.io workflows and activities, built as a TypeScript monorepo using pnpm workspaces and Turborepo.

**Core Packages:**

- `@temporal-contract/contract` - Contract builder and type definitions
- `@temporal-contract/worker` - Type-safe worker with automatic validation
- `@temporal-contract/client` - Type-safe client for consuming workflows
- `@temporal-contract/boxed` - Result and Future types for explicit error handling
- `@temporal-contract/testing` - Testing utilities

---

## TypeScript & Type Safety

### ✅ Required Practices

1. **Strict Type Safety**
   - Never use `any` type (enforced by oxlint rule `@typescript-eslint/no-explicit-any`)
   - Use `unknown` instead of `any` when type is truly unknown
   - Always provide explicit return types for exported functions

   ```typescript
   // ❌ Bad
   export function processData(data: any) {}

   // ✅ Good
   export function processData<T>(data: unknown): Result<T, Error> {}
   ```

2. **Generic Type Parameters**
   - Use descriptive generic names (not just `T`, `U`)
   - Document generic constraints clearly

   ```typescript
   // ❌ Bad
   function process<T>(item: T) {}

   // ✅ Good
   function processWorkflow<TWorkflow extends WorkflowDefinition>(workflow: TWorkflow): void {}
   ```

3. **Type Inference**
   - Leverage TypeScript's type inference where possible
   - Don't repeat types that can be inferred

   ```typescript
   // ❌ Bad
   const contract: ContractDefinition = defineContract({ ... });

   // ✅ Good
   const contract = defineContract({ ... });
   ```

4. **Standard Schema Compatibility**
   - Use `StandardSchemaV1` from `@standard-schema/spec` for schema interoperability
   - Support both Zod and other standard schema implementations

---

## Code Style & Formatting

### ✅ Automated Tools

1. **oxlint** - Linting (runs via `pnpm lint`)
2. **oxfmt** - Formatting (runs via `pnpm format`)
3. **sort-package-json** - Keep package.json sorted (runs via `pnpm sort-package-json`)

### ✅ Lint Suppression

When you need to suppress a specific oxlint rule, use the inline comment syntax:

```typescript
// ❌ Bad - Empty pattern triggers lint warning
async ({}, use) => {};

// ✅ Good - Explicitly disable the rule
// oxlint-disable-next-line no-empty-pattern
async ({}, use) => {};
```

**When to use:**

- Empty object patterns in Vitest fixture function parameters that don't need context
- Cases where the linter flags valid patterns that can't be easily refactored

**Note:** Always prefer refactoring over suppression when possible (e.g., use `_context` instead of `{}`).

### ✅ Required Practices

1. **File Extensions**
   - Always use `.js` extensions in imports (even for TypeScript files)

   ```typescript
   // ❌ Bad
   import { defineContract } from "./builder";

   // ✅ Good
   import { defineContract } from "./builder.js";
   ```

2. **Export Order**
   - Export public API functions first
   - Keep internal helpers private or at the end
   - Use classic function declarations for hoisting when needed

3. **Documentation Comments**
   - Use JSDoc comments for all exported APIs
   - Include `@param`, `@returns`, and examples where helpful

   ````typescript
   /**
    * Defines a contract with type-safe workflows and activities
    *
    * @param definition - The contract definition
    * @returns A fully typed contract
    *
    * @example
    * ```typescript
    * const contract = defineContract({
    *   taskQueue: 'orders',
    *   workflows: { processOrder: { ... } }
    * });
    * ```
    */
   export function defineContract<TContract extends ContractDefinition>(
     definition: TContract,
   ): TContract {}
   ````

4. **Naming Conventions**
   - Use `camelCase` for functions, variables, and methods
   - Use `PascalCase` for types, interfaces, and classes
   - Use `SCREAMING_SNAKE_CASE` for constants
   - Prefix type parameters with `T` (e.g., `TContract`, `TWorkflow`)

---

## Monorepo Structure

### ✅ Required Practices

1. **Package Independence**
   - Each package should be independently buildable
   - Avoid circular dependencies between packages
   - Use workspace protocol for internal dependencies: `"workspace:*"`

2. **Shared Configuration**
   - TypeScript configs extend from `@temporal-contract/tsconfig`
   - Keep configs DRY using inheritance

3. **Scripts**
   - Run from root using Turborepo: `pnpm build`, `pnpm test`
   - Package-specific scripts in individual packages
   - Use parallel execution for independent tasks

4. **File Organization**
   ```
   packages/[package-name]/
   ├── src/
   │   ├── index.ts          # Public API exports
   │   ├── types.ts          # Type definitions
   │   ├── [feature].ts      # Implementation
   │   └── [feature].spec.ts # Tests alongside code
   ├── package.json
   ├── tsconfig.json
   └── vitest.config.ts
   ```

---

## Temporal.io Patterns

### ✅ Required Practices

1. **Contract Definition**
   - Always validate contracts at definition time
   - Use Zod schemas for input/output validation
   - Group related workflows in a single contract

   ```typescript
   const contract = defineContract({
     taskQueue: "orders",
     workflows: {
       processOrder: {
         input: z.object({ orderId: z.string() }),
         output: z.object({ success: z.boolean() }),
         activities: {
           /* workflow-specific */
         },
       },
     },
     activities: {
       /* global activities */
     },
   });
   ```

2. **Activity Definitions**
   - Activities can be global or workflow-specific
   - Workflow-specific activities override global ones
   - Always validate both input and output
   - Check for naming conflicts (enforced by contract validation)

3. **Workflow Implementation**
   - Use type-safe workflow helpers from `@temporal-contract/worker`
   - Return `Result<T, E>` types for explicit error handling
   - Never throw exceptions in workflows (use Result pattern)

   ```typescript
   // ✅ Good
   export const processOrder = workflow.create(contract, "processOrder", async (ctx, input) => {
     const result = await ctx.activity("validateOrder", { orderId: input.orderId });
     if (result.isError()) {
       return new Error(result.error);
     }
     return new Ok({ success: true });
   });
   ```

4. **Child Workflows**
   - Use type-safe child workflow execution
   - Leverage Result/Future pattern for error handling
   - Validate workflow exists in contract

---

## Error Handling

### ✅ Required Practices

1. **Result Pattern**
   - Use `Result<T, E>` from `@temporal-contract/boxed` instead of throwing
   - Use `Ok` for success, `Error` for failure

   ```typescript
   // ❌ Bad
   function process(data: string): string {
     if (!data) throw new Error("Invalid data");
     return data.toUpperCase();
   }

   // ✅ Good
   function process(data: string): Result<string, string> {
     if (!data) return new Error("Invalid data");
     return new Ok(data.toUpperCase());
   }
   ```

2. **Future Pattern**
   - Use `Future<T, E>` for async operations in workflows
   - Handle both success and error cases explicitly

3. **Custom Error Classes**
   - Extend base error classes appropriately
   - Include helpful context (activity name, available options, etc.)
   - Use `Error.captureStackTrace` for V8 compatibility

   ```typescript
   export class ActivityDefinitionNotFoundError extends WorkerError {
     constructor(
       public readonly activityName: string,
       public readonly availableDefinitions: readonly string[] = [],
     ) {
       const available = availableDefinitions.length > 0 ? availableDefinitions.join(", ") : "none";
       super(
         `Activity definition not found for: "${activityName}". Available activities: ${available}`,
       );
       this.name = "ActivityDefinitionNotFoundError";
       if (Error.captureStackTrace) {
         Error.captureStackTrace(this, this.constructor);
       }
     }
   }
   ```

4. **Validation Errors**
   - Use StandardSchemaV1.Issue for validation errors
   - Provide clear, actionable error messages
   - Include which field failed and why

---

## Testing Requirements

### ✅ Required Practices

1. **Test Framework**
   - Use `vitest` for all tests
   - Place tests alongside source: `feature.spec.ts`
   - Use integration tests in `__tests__` directories

2. **Test Structure**

   ```typescript
   import { describe, expect, it } from "vitest";

   describe("Feature Name", () => {
     describe("specific function/method", () => {
       it("should do something specific", () => {
         // GIVEN
         const input = {
           /* ... */
         };

         // WHEN
         const result = functionUnderTest(input);

         // THEN
         expect(result).toEqual(expectedValue);
       });
     });
   });
   ```

3. **Test Coverage**
   - Write tests for all exported functions
   - Test happy path and error cases
   - Test edge cases and boundary conditions
   - Use `expect.objectContaining()` for partial matching

4. **Integration Tests**
   - Use `@temporal-contract/testing` utilities
   - Test actual Temporal.io workflows with test server
   - Place in separate test files or `__tests__` directories

5. **Test Naming**
   - Use descriptive test names: "should [expected behavior] when [condition]"
   - Group related tests in `describe` blocks
   - Keep tests focused on one thing

6. **Assertion Best Practices**
   - Merge multiple assertions into one whenever possible for clarity
   - Use `expect.objectContaining()` or `toMatchObject()` for complex object validation
   - Prefer single comprehensive assertions over multiple fragmented ones

   ```typescript
   // ❌ Bad - multiple fragmented assertions
   it("should return valid user", () => {
     const user = createUser({ name: "John", age: 30 });
     expect(user.name).toBe("John");
     expect(user.age).toBe(30);
     expect(user.id).toBeDefined();
     expect(user.createdAt).toBeInstanceOf(Date);
   });

   // ✅ Good - merged into comprehensive assertion
   it("should return valid user", () => {
     const user = createUser({ name: "John", age: 30 });
     expect(user).toMatchObject({
       name: "John",
       age: 30,
       id: expect.any(String),
       createdAt: expect.any(Date),
     });
   });
   ```

---

## Documentation Standards

### ✅ Required Practices

1. **README Files**
   - Every package must have a README.md
   - Include: description, installation, usage examples, API overview
   - Keep examples up-to-date with code

2. **Code Comments**
   - Use JSDoc for all public APIs
   - Explain "why" not "what" in inline comments
   - Keep comments concise and relevant

3. **Examples**
   - Provide working examples in `samples/` directory
   - Examples should demonstrate real-world usage
   - Include both basic and advanced patterns

4. **Website Documentation**
   - Keep `website/docs/` in sync with code changes
   - Update API documentation when signatures change
   - Add guides for new features

5. **Changelog**
   - Use Changesets for versioning: `pnpm changeset`
   - Describe user-facing changes clearly
   - Follow semantic versioning

---

## Performance & Best Practices

### ✅ Required Practices

1. **Validation**
   - Validate at boundaries (workflow/activity inputs/outputs)
   - Use `safeParse` instead of `parse` to avoid exceptions
   - Cache validation schemas when possible

2. **Immutability**
   - Use `readonly` for data that shouldn't change
   - Prefer `const` over `let`
   - Use readonly arrays: `readonly string[]`

3. **Function Design**
   - Keep functions small and focused
   - Avoid side effects in pure functions
   - Use pure functions where possible

4. **Dependencies**
   - Minimize external dependencies
   - Use peer dependencies for Temporal.io packages
   - Keep bundle size small

---

## Common Review Issues

### ❌ Anti-Patterns to Avoid

1. **Using `any` type**

   ```typescript
   // ❌ Never do this
   function process(data: any): any {}
   ```

2. **Throwing exceptions in workflows**

   ```typescript
   // ❌ Bad - breaks Result pattern
   export const workflow = async () => {
     throw new Error("Something failed");
   };

   // ✅ Good - use Result pattern
   export const workflow = async (): Promise<Result<Output, Error>> => {
     return new Error("Something failed");
   };
   ```

3. **Missing input/output validation**

   ```typescript
   // ❌ Bad - no validation
   const activity = {
     handler: async (input) => {
       /* ... */
     },
   };

   // ✅ Good - with contract validation
   const contract = defineContract({
     activities: {
       processData: {
         input: z.object({ id: z.string() }),
         output: z.object({ success: z.boolean() }),
       },
     },
   });
   ```

4. **Missing `.js` extensions in imports**

   ```typescript
   // ❌ Bad
   import { helper } from "./utils";

   // ✅ Good
   import { helper } from "./utils.js";
   ```

5. **Not using workspace protocol**

   ```typescript
   // ❌ Bad in package.json
   "dependencies": {
     "@temporal-contract/contract": "^0.4.0"
   }

   // ✅ Good in package.json (for monorepo)
   "dependencies": {
     "@temporal-contract/contract": "workspace:*"
   }
   ```

6. **Ignoring TypeScript errors**
   - Never use `@ts-ignore` or `@ts-expect-error` without explanation
   - Fix the root cause instead of suppressing errors

7. **Missing tests**
   - Every new feature needs tests
   - Every bug fix needs a regression test

8. **Not running checks before PR**
   ```bash
   # Always run before submitting PR:
   pnpm typecheck
   pnpm lint
   pnpm format --check
   pnpm test
   ```

---

## Pre-Commit Checklist

Before submitting code, ensure:

- [ ] TypeScript compiles without errors (`pnpm typecheck`)
- [ ] All tests pass (`pnpm test`)
- [ ] Code is properly formatted (`pnpm format`)
- [ ] No linting errors (`pnpm lint`)
- [ ] Package.json files are sorted (`pnpm sort-package-json --check`)
- [ ] Commit message follows conventional commits format
- [ ] Public APIs have JSDoc comments
- [ ] New features have tests
- [ ] Documentation is updated if needed
- [ ] No `any` types used
- [ ] Result/Future pattern used for error handling
- [ ] `.js` extensions in all imports

---

## Questions or Clarifications?

If you're unsure about any guideline:

1. Check existing code for patterns
2. Look at the samples in `samples/` directory
3. Review recent PRs for examples
4. Open a discussion on GitHub

---

**Remember:** These guidelines help maintain code quality and consistency. They're not just rules—they're best practices learned from experience with Temporal.io and TypeScript!
