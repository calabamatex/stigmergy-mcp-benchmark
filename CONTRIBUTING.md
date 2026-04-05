# Contributing to stigmergy-mcp-benchmark

## Prerequisites

- Node.js >= 20
- pnpm >= 9

## Setup

```bash
git clone https://github.com/calabamatex/stigmergy-mcp-benchmark.git
cd stigmergy-mcp-benchmark
pnpm install
pnpm build
pnpm test
```

## Project Structure

This is a pnpm monorepo with the following packages:

| Package | Purpose |
|---------|---------|
| `core` | Shared types, enums, config validation |
| `stats` | Statistical analysis (bootstrap, Wilcoxon, TOST) |
| `storage` | SQLite persistence |
| `llm-client` | Multi-provider LLM abstraction |
| `classifier` | Token classification engine |
| `tasks` | Benchmark task definitions |
| `executors` | Run A/B/C execution strategies |
| `stigmergy-mcp` | Stigmergic trace store + MCP server |
| `engine` | Comparison orchestration |
| `cli` | Command-line interface |
| `dashboard` | Web UI (Express + React) |

## Development Workflow

```bash
# Build all packages
pnpm build

# Run all tests
pnpm test

# Type-check without building
pnpm typecheck

# Lint
pnpm lint

# Format code
pnpm format
```

## Adding a Benchmark Task

1. Create a new file in `packages/tasks/src/` (e.g., `t07-your-task.ts`)
2. Define the task following the `BenchmarkTask` interface from `@stigmergy-benchmark/core`
3. Register it in `packages/tasks/src/registry.ts`
4. Add tests in `packages/tasks/tests/`

## Running Benchmarks

```bash
# List available tasks
node packages/cli/dist/index.js tasks list

# Run a comparison with mock provider
node packages/cli/dist/index.js compare --task research-report --trials 10 --provider mock

# Run with real LLM (requires API key)
node packages/cli/dist/index.js compare --task research-report --trials 5 --provider anthropic --model claude-sonnet-4-20250514

# View results
node packages/cli/dist/index.js results list
node packages/cli/dist/index.js results show <comparison-id>
```

## Code Style

- TypeScript strict mode is enforced
- ESLint + Prettier are configured at the repo root
- Use `import type` for type-only imports
- Prefer `type` imports when the import is only used in type positions
