# Knip Configuration Documentation

This document explains the Knip configuration choices made for this monorepo and addresses common questions about dependency management and best practices.

## Overview

[Knip](https://knip.dev/) is a comprehensive tool for finding unused files, dependencies, and exports in JavaScript and TypeScript projects. It helps maintain a clean codebase and reduce bundle sizes.

## Configuration File

The configuration is located in `knip.json` at the root of the repository.

## Key Configuration Choices

### 1. Global Settings

#### `ignoreExportsUsedInFile: true`

This setting prevents Knip from reporting exports that are only used within the same file. This is particularly useful for library packages where helper functions or types might be co-located with their usage.

**Rationale**: Reduces noise in the output and focuses on truly unused exports across file boundaries.

#### Vitest Plugin Configuration

```json
"vitest": {
  "config": ["**/vitest.config.ts"]
}
```

Explicitly configures Knip to recognize all vitest configuration files across the monorepo.

**Rationale**: Ensures test files and their dependencies are properly tracked by Knip's built-in Vitest plugin.

### 2. Workspace-Specific Settings

#### Test Workflow Files as Entry Points

For `packages/client` and `packages/worker`, test workflow files are included as entry points:

```json
"entry": ["src/index.ts", "src/__tests__/test.workflows.ts"]
```

**Rationale**: These workflow files are loaded dynamically by Temporal workers using file paths (via `workflowsPath`), not through standard import statements. Without marking them as entry points, Knip would incorrectly flag them and their dependencies (like `@temporalio/workflow`) as unused.

**Why not use `ignoreDependencies`?**: Including files as entry points is more precise than ignoring dependencies globally. It ensures:

- The files themselves are tracked
- All their dependencies are analyzed
- Only truly unused code is reported

#### Simplified Project Patterns

All workspaces now use `"project": ["src/**/*.ts"]` instead of excluding test files.

**Rationale**:

- Knip's Vitest plugin automatically handles test files correctly
- Simpler configuration is easier to maintain
- Test dependencies are properly tracked

### 3. ignoreDependencies

The configuration uses `ignoreDependencies` sparingly, only for legitimate edge cases:

#### Root Level: `pino-pretty`

```json
"ignoreDependencies": ["pino-pretty"]
```

**Why is this needed?**
`pino-pretty` is used as a transport in Pino logger configuration:

```typescript
export const logger = pino({
  transport: {
    target: "pino-pretty",  // Referenced as a string, not imported
    options: { ... }
  }
});
```

**Rationale**: The dependency is referenced as a string and loaded dynamically by Pino at runtime. Knip cannot detect this usage pattern through static analysis.

**Alternative approaches considered**:

- Direct import: Not possible with Pino's transport API
- Dev-only usage: Would miss runtime errors in development

#### `packages/boxed`: `@swan-io/boxed`

```json
"packages/boxed": {
  "ignoreDependencies": ["@swan-io/boxed"]
}
```

**Why is this needed?**
This package provides interoperability utilities between `@temporal-contract/boxed` and `@swan-io/boxed`. The dependency is:

- Declared as an optional peerDependency
- Only used in `src/interop.ts` for type conversions
- Not required for the core functionality

**Rationale**: The package is used for interop but is optional. Users can choose to use the interop features or not.

## Best Practices Followed

### ✅ Do's

1. **Use entry points instead of ignoreDependencies** when possible
   - More precise tracking
   - Better visibility into actual usage
2. **Document ignored dependencies**
   - Clear rationale in configuration
   - Additional documentation in this file

3. **Leverage built-in plugins**
   - Vitest, TypeScript, Turbo, etc.
   - Automatic detection of tool-specific patterns

4. **Keep configuration DRY**
   - Use workspace patterns (`packages/*`, `samples/*`)
   - Minimize workspace-specific overrides

### ❌ Don'ts

1. **Don't ignore dependencies to "fix" Knip warnings**
   - Investigate why Knip reports it as unused
   - Fix the root cause (missing entry points, incorrect project patterns)

2. **Don't exclude test files from project patterns unnecessarily**
   - Knip's plugins handle test files correctly
   - Test dependencies should be tracked

3. **Don't ignore devDependencies that are actually unused**
   - Remove them from package.json instead
   - Keep dependencies lean

## Running Knip

### Check for unused code and dependencies

```bash
pnpm knip
```

### Auto-fix fixable issues

```bash
pnpm knip:fix
```

### Check specific workspace

```bash
pnpm knip --workspace packages/client
```

### Show only dependency issues

```bash
pnpm knip --dependencies
```

## Common Questions

### Q: Why do I see "unused file" warnings for my test utilities?

**A**: Test utilities should either be:

1. Imported by test files (preferred)
2. Added as entry points if they're loaded dynamically

### Q: Should I add all devDependencies to ignoreDependencies?

**A**: No! Only ignore dependencies that are:

- Used through dynamic loading (string references)
- Required by external tools that Knip doesn't understand
- Properly documented with reasoning

### Q: How do I know if a dependency is truly unused?

**A**: Run these checks:

1. Search for imports: `grep -r "from 'package-name'" src/`
2. Check package.json scripts
3. Check config files (may use string references)
4. Verify with `pnpm why package-name`

## Maintenance

### Adding New Packages

When adding a new package to the monorepo:

1. Add workspace entry if it doesn't match existing patterns
2. Specify entry points explicitly
3. Avoid adding to ignoreDependencies initially

### Updating Dependencies

Before adding to ignoreDependencies:

1. Confirm the dependency is actually needed
2. Check if it can be detected via entry points
3. Document the reason if it must be ignored

## Further Reading

- [Knip Documentation](https://knip.dev/)
- [Knip Best Practices](https://knip.dev/explanations/best-practices)
- [Monorepos & Workspaces](https://knip.dev/features/monorepos-and-workspaces)
- [Built-in Plugins](https://knip.dev/reference/plugins)
