# Contributing to temporal-contract

Thank you for your interest in contributing to temporal-contract! 🎉

## Development Setup

1. Fork and clone the repository:

```bash
git clone https://github.com/yourusername/temporal-contract.git
cd temporal-contract
```

2. Install dependencies:

```bash
pnpm install
```

3. Build all packages:

```bash
pnpm build
```

## Project Structure

This is a monorepo managed with **pnpm workspaces** and **Turborepo**:

```
temporal-contract/
├── packages/
│   ├── core/           # Core types and utilities
│   ├── contract/       # Contract builder
│   ├── worker/         # Worker implementation utilities
│   └── client/         # Client for consuming workflows
└── examples/           # Example usage
```

## Making Changes

1. Create a new branch:

```bash
git checkout -b feature/your-feature-name
```

2. Make your changes in the appropriate package

3. Build and test:

```bash
pnpm build
pnpm test
```

4. Commit your changes:

```bash
git commit -m "feat: description of your changes"
```

5. Push and create a pull request

## Commit Convention

We follow [Conventional Commits](https://www.conventionalcommits.org/):

- `feat:` - New feature
- `fix:` - Bug fix
- `docs:` - Documentation changes
- `refactor:` - Code refactoring
- `test:` - Adding tests
- `chore:` - Maintenance tasks

## Building

```bash
# Build all packages
pnpm build

# Build specific package
cd packages/core
pnpm build

# Watch mode for development
pnpm dev
```

## Testing

```bash
# Run all tests
pnpm test

# Test specific package
cd packages/worker
pnpm test
```

## Adding a New Package

1. Create a new directory under `packages/`
2. Add `package.json` with `name: @temporal-contract/package-name`
3. Add to the monorepo by running `pnpm install` from root
4. Update relevant documentation

## Questions?

Feel free to open an issue for any questions or concerns!
