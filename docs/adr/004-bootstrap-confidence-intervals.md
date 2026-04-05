# ADR-004: Bootstrap Confidence Intervals Over Analytical CIs

## Status

Accepted

## Context

Confidence intervals for median savings percentage need to be computed with small sample sizes (n = 3-30 typical). Analytical CIs for medians require distributional assumptions or large-n asymptotics.

## Decision

Use BCa (bias-corrected and accelerated) bootstrap with 10,000 resamples.

## Rationale

- **Assumption-free**: works regardless of underlying distribution shape
- **Small-sample valid**: more accurate than analytical approximations at n < 30
- **BCa correction**: adjusts for bias and skewness in the bootstrap distribution, producing better coverage than percentile bootstrap
- **Standard practice**: widely accepted in empirical software engineering research

## Trade-offs

- Computationally heavier than analytical formulas (10K resamples), but completes in <100ms for typical n
- Non-deterministic unless seeded (acceptable for CIs; point estimates are deterministic)

## Consequences

- CIs are only reported when n >= 5 (PROVISIONAL level shows point estimates without CIs)
- Progressive reporting levels gate CI display by sample size
