# Contributing to temporal-contract

Thank you for your interest! 🎉

## Quick Start

```bash
# 1. Fork & clone
git clone https://github.com/yourusername/temporal-contract.git
cd temporal-contract

# 2. Install & build
pnpm install
pnpm build

# 3. Make changes & test
pnpm test
pnpm typecheck
```

## Project Structure

**Monorepo** with pnpm workspaces + Turborepo:

```
temporal-contract/
├── packages/       # Core packages (contract, worker, client, boxed, testing)
├── samples/        # Working examples
├── website/        # Documentation website
└── tools/          # Dev tools (testing utilities, configs)
```

## Coding Guidelines

📋 **[Read the complete coding guidelines](.github/copilot-instructions.md)**

This project uses AI-assisted code review with GitHub Copilot. Our guidelines document:

- TypeScript & type safety requirements
- Code style & formatting rules
- Error handling patterns (Result/Future)
- Testing best practices
- Common review issues to avoid

These guidelines are both human-readable and used for automated reviews.

## Making Changes

1. **Branch:** `git checkout -b feat/your-feature`
2. **Code:** Make your changes following the [coding guidelines](.github/copilot-instructions.md)
3. **Test:** `pnpm test && pnpm typecheck`
4. **Commit:** `git commit -m "feat: description"`
5. **PR:** Push and create pull request

## Commit Convention

Follow [Conventional Commits](https://www.conventionalcommits.org/):

- `feat:` — New feature
- `fix:` — Bug fix
- `docs:` — Documentation only
- `refactor:` — Code refactoring
- `test:` — Add tests
- `chore:` — Maintenance

**Note:** Commit messages are automatically validated via git hooks using [commitlint](https://commitlint.js.org/). Non-conventional commits will be rejected.

## Commands

```bash
pnpm build          # Build all packages
pnpm test           # Run all tests
pnpm typecheck      # Type checking
pnpm lint           # Lint code
pnpm format         # Format code

# Package-specific
cd packages/worker
pnpm build
pnpm test
```

## Release Process

We use [Changesets](https://github.com/changesets/changesets):

1. Make changes
2. Run `pnpm changeset` and describe changes
3. Commit changeset file
4. CI creates release PR automatically

## Questions?

Open an issue or discussion on GitHub!
