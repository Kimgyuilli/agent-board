# Contributing to Agent Board

Thank you for your interest in contributing to Agent Board! This guide will help you get started.

## Prerequisites

- [Node.js](https://nodejs.org/) 18+
- [pnpm](https://pnpm.io/) 9+
- [VS Code](https://code.visualstudio.com/) 1.85+

## Development Setup

1. Fork and clone the repository:
   ```bash
   git clone https://github.com/<your-username>/agent-board.git
   cd agent-board
   ```

2. Install dependencies:
   ```bash
   pnpm install
   ```

3. Build all packages:
   ```bash
   pnpm build
   ```

4. Open in VS Code and press `F5` to launch the Extension Development Host.

## Monorepo Structure

```
packages/
├── shared/        # Shared TypeScript types (build first)
├── mcp-server/    # MCP tools + SQLite database
├── webview/       # React kanban board UI (Vite + Tailwind)
└── extension/     # VS Code extension host (esbuild)
```

### Build Order

Build order matters due to package dependencies:

```
shared → mcp-server + webview (parallel) → extension
```

### Per-Package Commands

```bash
# Build individual packages
pnpm --filter @agent-board/shared build
pnpm --filter @agent-board/mcp-server build
pnpm --filter @agent-board/webview build
pnpm --filter agent-board build          # extension (depends on webview + mcp-server)

# Test
pnpm test                                # all packages
pnpm --filter @agent-board/mcp-server test
pnpm --filter @agent-board/webview test
pnpm --filter agent-board test           # extension

# Lint
pnpm lint
```

## Code Conventions

- **TypeScript** strict mode across all packages
- **ESLint + Prettier** for formatting
- **Component size**: Keep React components under 300 lines; extract custom hooks when `useState` exceeds ~10
- **DB queries**: Use parameterized queries with a service layer pattern
- **Extension**: Follow the Disposable pattern with `activate`/`deactivate` lifecycle

## Branch Naming

- `feat/<description>` — New feature
- `fix/<description>` — Bug fix
- `refactor/<description>` — Refactoring
- `docs/<description>` — Documentation

## Commit Messages

Follow [Conventional Commits](https://www.conventionalcommits.org/):

```
feat: add drag-and-drop task reordering
fix: resolve notification duplicate issue
docs: update MCP setup instructions
refactor: extract board client service
```

## Pull Request Process

1. Create a feature branch from `main`
2. Make your changes with tests
3. Ensure all checks pass:
   ```bash
   pnpm build && pnpm test && pnpm lint
   ```
4. Submit a pull request with a clear description
5. Address review feedback

## Testing

- **Unit/Integration tests**: [Vitest](https://vitest.dev/)
- **E2E tests**: [@vscode/test-electron](https://github.com/microsoft/vscode-test)

```bash
# Run all tests
pnpm test

# Run with watch mode (development)
pnpm --filter @agent-board/webview exec vitest
```

## License

By contributing, you agree that your contributions will be licensed under the [MIT License](LICENSE).
