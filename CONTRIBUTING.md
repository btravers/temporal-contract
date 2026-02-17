# Contributing to temporal-contract

Thank you for your interest in contributing! This guide will help you get started.

## Prerequisites

- **Node.js** 24+
- **pnpm** 10+
- **Docker** (for integration tests)

## Getting Started

```bash
# Clone the repository
git clone https://github.com/your-org/temporal-contract.git
cd temporal-contract

# Install dependencies
pnpm install

# Build all packages
pnpm build

# Run unit tests
pnpm test
```

## Development Workflow

1. Create a branch from `main`
2. Make your changes
3. Run quality checks (see below)
4. Create a changeset: `pnpm changeset`
5. Submit a pull request

## Quality Checks

Run all checks before submitting a PR:

```bash
pnpm build              # Build all packages
pnpm typecheck          # Type-check
pnpm lint               # Run oxlint
pnpm format --check     # Check formatting
pnpm test               # Run unit tests
pnpm test:integration   # Run integration tests (requires Docker)
pnpm knip               # Check for unused exports/dependencies
```

Pre-commit hooks (via Lefthook) automatically run formatting, linting, and package.json sorting.

## Code Style

- Use `type` instead of `interface` (enforced by linter)
- Use `.js` extensions in all imports
- Use `Result<T, E>` pattern instead of throwing exceptions
- Never use `any` — use `unknown` instead
- See [.agents/rules/code-style.md](.agents/rules/code-style.md) for full details

## Test Conventions

| Type              | Location                  | Pattern                   |
| ----------------- | ------------------------- | ------------------------- |
| Unit tests        | `src/*.spec.ts`           | Alongside source files    |
| Integration tests | `src/__tests__/*.spec.ts` | In `__tests__/` directory |

## Commit Messages

Follow [Conventional Commits](https://www.conventionalcommits.org/):

```
feat: add new feature
fix: fix a bug
docs: update documentation
chore: maintenance tasks
refactor: code restructuring
test: add or update tests
```

Commit messages are automatically validated via git hooks using [commitlint](https://commitlint.js.org/).

## Versioning

We use [Changesets](https://github.com/changesets/changesets) for version management:

```bash
pnpm changeset          # Create a changeset describing your change
pnpm version            # Apply changesets (maintainers only)
pnpm release            # Publish to npm (maintainers only)
```

## Project Structure

See [.agents/rules/project-overview.md](.agents/rules/project-overview.md) for the full architecture overview.
