# ADR-005: In-Memory MCP Bridge for Stigmergy

## Status

Accepted

## Context

The stigmergy execution strategy requires MCP (Model Context Protocol) tool serving for trace/signal operations. Options: external MCP server process, HTTP-based mock, in-memory bridge.

## Decision

Use an in-memory MCP bridge that intercepts tool calls and routes them to a local artifact store.

## Rationale

- **No network overhead**: tool calls resolve in-process, eliminating latency variance from network I/O
- **Deterministic**: no external state; artifact store resets between trials
- **Portable**: no server to start/stop; works identically in CI and local environments
- **Token-accurate**: token counting captures the exact request/response payloads without transport-layer noise

## Trade-offs

- Does not test real MCP transport (stdio/SSE); assumes protocol correctness
- Artifact store is ephemeral; no persistence of stigmergy state across benchmark runs

## Consequences

- Real MCP validation should be added as an integration test (future work)
- The bridge must faithfully implement the 6 stigmergy tool schemas (deposit_trace, sense_environment, reinforce_trace, get_gradient, sense_and_claim, deposit_signal)
