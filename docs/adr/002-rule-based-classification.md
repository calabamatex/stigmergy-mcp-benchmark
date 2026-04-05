# ADR-002: Rule-Based Token Classification

## Status

Accepted

## Context

The benchmark must classify every token into one of 5 categories (Task Reasoning, Content Transfer, Mechanism Overhead, Coordination Instructions, System Identity). Options: ML classifier, LLM-as-judge, rule-based regex.

## Decision

Use deterministic rule-based classification with regex pattern matching.

## Rationale

- **Reproducibility**: identical inputs always produce identical classifications, critical for a benchmark tool
- **Zero cost**: no additional API calls; classification adds negligible latency
- **Transparency**: rules are auditable and debuggable (categories.ts lists all patterns)
- **Run-type awareness**: classification strategy varies by run type (A/B/C), which is straightforward with rules but complex with ML

## Trade-offs

- Less accurate on edge cases than an LLM-as-judge approach
- Pattern maintenance burden as new coordination protocols emerge
- 500-char content-bearing threshold is a heuristic that may need tuning

## Consequences

- Misclassification rate should be monitored via cross-validation checks
- Patterns must be updated when new stigmergy tools are added
