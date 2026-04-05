# ADR-003: Wilcoxon Signed-Rank Over Paired t-Test

## Status

Accepted

## Context

Statistical comparison of token usage between run types requires a paired test (same task, same trial). The paired t-test assumes normally distributed differences; token usage distributions are typically right-skewed with outliers.

## Decision

Use the Wilcoxon signed-rank test as the primary significance test.

## Rationale

- **Distribution-free**: no normality assumption; valid for skewed token distributions
- **Paired design**: naturally handles the within-trial pairing (Run B vs Run C on same trial)
- **Robust to outliers**: rank-based, so extreme values don't dominate
- **Conservative**: slightly less powerful than t-test when normality holds, but wrong assumptions are worse than reduced power

## Consequences

- Requires n >= 6 for meaningful p-values (enforced by reporting levels)
- Effect size reported via median savings rather than mean difference
- TOST equivalence testing complements Wilcoxon for "no worse than" claims
