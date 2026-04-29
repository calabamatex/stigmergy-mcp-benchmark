# Stigmergy-MCP Benchmark: Executive Summary

**Phase 1 Findings, April 2026**

---

## The Problem

Companies deploying multi-agent AI systems face a scaling wall. As more AI agents are added to coordinate on a task, the cost of communication between them grows quadratically. By the time a workflow involves 10 agents, the agents spend more tokens talking to each other than doing the actual work. This drives up cost, slows responses, and creates a ceiling on how complex multi-agent workflows can practically become.

The conventional approach is direct message-passing: each agent receives a summary of all prior agents' outputs before doing its part. This works for small swarms but breaks down at scale.

## The Hypothesis

Borrowing a concept from biology — how ant colonies coordinate without direct communication — the stigmergy approach replaces direct messaging with a shared environment. Agents leave compact "traces" that other agents can read. This shifts coordination cost from quadratic growth to linear growth, in exchange for a fixed setup cost per agent.

The question is whether the architectural advantage outweighs the setup cost in practice, and at what agent count the trade flips.

## The Finding

At 10 agents on a sequential coordination task, stigmergy reduces inter-agent token consumption by **46 percent** compared to direct message-passing.

The result is statistically significant (Wilcoxon signed-rank test, p = 0.002) with a 95 percent confidence interval of 38 to 54 percent. The probability of observing this difference by chance, if there were no underlying advantage, is approximately 1 in 500.

The Content Transfer category specifically — the actual work product passed between agents — is reduced by **72 percent** (95 percent CI: 67 to 76 percent).

The finding is reproducible. Three independent runs converged on the same directional result, with central tendencies between 46 and 55 percent.

## What This Means

For systems with fewer than approximately 4 agents, message-passing remains more efficient. The stigmergy protocol setup cost outweighs the savings on small swarms.

For systems with 10 or more agents, stigmergy becomes substantially more efficient. The crossover point lives between 3 and 10 agents and varies with task characteristics.

A practical guideline: if a multi-agent workflow involves more than a handful of coordinating agents, stigmergy-style architecture is worth evaluating. If it involves only a few agents, direct message-passing is likely the simpler and more efficient choice.

## What This Does Not Mean

This benchmark measures a specific scenario: short-lived agents (one to two API calls each) on sequential coordination tasks. Real production deployments often involve agents that loop for many turns. Under those conditions, the stigmergy advantage should appear at lower agent counts because the protocol setup cost gets amortized across more useful work.

The benchmark therefore measures the worst case for stigmergy. The advantage in real deployments is expected to be larger, not smaller. Confirming this requires the next phase of testing.

## What's Next

**Phase 2** will vary the number of turns each agent runs, testing the amortization argument. This is the most strategically important next step because it bridges benchmark conditions to real deployment conditions.

**Phase 3** will vary the size of work products being passed between agents, since larger handoffs accelerate the quadratic growth in message-passing and shift the crossover point earlier.

Together, Phases 2 and 3 will produce a multi-dimensional picture of when stigmergy applies in practice, suitable for direct guidance to architects building multi-agent systems.

## Methodology Note

The benchmark uses three architectures running identical tasks: a single-agent baseline, a message-passing swarm (control), and a stigmergy swarm (experimental). Token consumption is decomposed into five categories so the source of any savings can be identified precisely. The statistical framework includes paired trial design, bootstrap confidence intervals, and Wilcoxon signed-rank hypothesis testing with progressive reporting tiers.

The full methodology, source code, and raw data are available at github.com/calabamatex/stigmergy-mcp-benchmark on the `results/phase-1-data` branch. The canonical Phase 1 result is identified by Result ID `c8e5cfb5-574b-4ffc-b0ad-7d0a3823cf00`.

## The Bottom Line

Multi-agent AI systems have a scaling problem that gets worse with every agent added. Phase 1 of this benchmark establishes that an alternative architecture exists, has a measurable advantage at scale, and crosses over from worse to better somewhere between 3 and 10 agents. Phases 2 and 3 will tell us where exactly that crossover lives in real deployment conditions.

For organizations operating multi-agent systems above approximately 5 agents, this is worth paying attention to. The savings compound at scale, and the architecture is openly published.
