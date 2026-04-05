# ADR-001: SQLite for Benchmark Persistence

## Status

Accepted

## Context

The benchmark produces structured trial data that must persist across runs for comparison, export, and retrospective analysis. Options considered: JSON files, PostgreSQL, SQLite.

## Decision

Use SQLite via better-sqlite3 (synchronous, single-process).

## Rationale

- **Zero infrastructure**: no server to run; database is a single file
- **Portable**: results file can be shared, archived, or version-controlled
- **Sufficient performance**: benchmark writes are low-frequency (one row per trial)
- **Type-safe**: better-sqlite3 is synchronous, avoiding callback complexity
- **CLI-friendly**: `--db <path>` flag makes database location explicit

## Consequences

- Single-writer limitation is acceptable (benchmarks run sequentially)
- No built-in replication; users must copy the .db file for sharing
- Schema migrations needed if TrialResult shape changes
