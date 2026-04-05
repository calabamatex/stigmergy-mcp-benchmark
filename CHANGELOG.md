# Changelog

All notable changes to the Stigmergy-MCP Benchmark will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/),
and this project adheres to [Semantic Versioning](https://semver.org/).

## [0.1.0-alpha.1] - 2026-04-05

### Added

- Core benchmark framework: 6 tasks × 3 execution strategies × n trials
- 5-category token classifier (Task Reasoning, Content Transfer, Mechanism Overhead, Coordination Instructions, System Identity)
- Rule-based classifier with regex pattern matching
- Three executor strategies: Single Agent, Message-Passing, Stigmergy Swarm
- Mock LLM client with seeded PRNG for deterministic testing
- Real LLM client wrappers for Anthropic and OpenAI APIs
- Retry client with jittered exponential backoff
- Rate-limited client with token budget enforcement
- SQLite-backed persistence for benchmark results
- Statistical analysis: bootstrap CIs, Wilcoxon signed-rank, TOST equivalence, reporting levels
- CLI with compare, tasks list, results list, results show commands
- Live dashboard with terminal UI
- In-memory MCP bridge for stigmergy tool serving
- Cross-validation between run types (monotonicity, conservation, category-sum checks)
- Progressive statistical reporting (RAW_ONLY → PROVISIONAL → PRELIMINARY → FULL → PUBLICATION)

### Infrastructure

- pnpm monorepo with 10 packages
- TypeScript strict mode across all packages
- ESLint 9 flat config + Prettier
- Vitest with V8 coverage (61-99% per package)
- GitHub Actions CI (Node 20 + 22)
- Husky + lint-staged pre-commit hooks
- 168 automated tests including E2E and property-based tests
