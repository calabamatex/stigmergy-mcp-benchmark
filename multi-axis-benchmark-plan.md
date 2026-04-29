# Multi-Axis Benchmark Plan: Stigmergy-MCP

**Status:** Phase 1 canonical FULL-tier result obtained at n=10. First positive savings datum below n=10 obtained at n=5 (PRELIMINARY tier). Crossover bounded between 3 and 5 agents on sequential tasks. Six, seven, and eight-agent runs pending API credit top-up. Cross-validation still flags UNRELIABLE due to low-variance regime issue — must be addressed before publication.
**Owner:** Ethan
**Last updated:** April 29, 2026

## Purpose

Capture the framing for expanding the stigmergy-mcp benchmark from its current single-axis design (agent count only) to a multi-axis factorial that supports defensible practical applicability claims. This document is the planning artifact for sequencing that work and for tracking discoveries during Phase 1 execution. It is not a final experimental design specification.

## Headline Finding

The thesis is confirmed across multiple agent counts on a sequential pipeline task family (write an N-section guide to building a production-ready REST API):

| Agent Count | Tier | n | Inter-Agent Savings | CT Savings | Effective Savings | Notes |
|---|---|---|---------------------|------------|-------------------|-------|
| 1 | PRELIMINARY | 5 | -3803% | 0% | -841% | Validator (no coordination work) |
| 2 | PRELIMINARY | 5 | -2600% | -552% | -1884% | Stigmergy unamortized at low N |
| 3 | PRELIMINARY | 5 | -100% | — | -79% | CI crosses zero ([-170, +6]) |
| **5** | **PRELIMINARY** | **7** | **+35%** | **+91%** | **+50%** | **First positive result below n=10** |
| **10** | **FULL** | **10** | **+46%** | **+72%** | **+30%** | **Canonical, p = 0.002** |

**Crossover bounded between 3 and 5 agents on sequential tasks.** Most likely close to n=4 based on the steepness of the transition between 3 and 5.

The canonical n=10 result is the publication-grade anchor: 46.3 percent inter-agent savings (95% CI [38.0, 53.5]) with formal hypothesis test p = 0.002. Three independent samples at n=10 (Run 1: n=7, Run 2: n=3, Run 3: n=10 canonical) all converge on overlapping confidence intervals.

The n=5 result confirms savings exist below n=10 with a Content Transfer Savings of 90.8 percent — actually higher than at n=10 in percentage terms, though smaller in absolute tokens (see Open Threads).

**Recommended public claim:** Stigmergy reduces inter-agent token consumption by approximately 46 percent (95% CI: 38-54%, p = 0.002) at 10 agents on sequential coordination tasks, with content transfer specifically reduced by 72 percent. The crossover from message-passing efficiency to stigmergy efficiency lives between 3 and 5 agents. Result anchored on n=10 FULL-tier sample; reproducibility confirmed across three independent samples plus one supporting result at n=5.

## Current Benchmark Scope

The existing benchmark varies one axis: number of agents. Tasks now span 1, 2, 3, 4, 5, 6, 7, 8, and 10 agents across sequential, parallel, and iterative coordination patterns. Token consumption is measured across five categories (Content Transfer, Mechanism Overhead, Coordination Instructions, Task Reasoning, System Identity). Statistical infrastructure is in place: bootstrap confidence intervals, Wilcoxon signed-rank, TOST equivalence testing, and progressive reporting tiers from PROVISIONAL through PUBLICATION.

The benchmark is methodologically sound for what it tests. Foundational scaffolding is solid. Multiple bugs were found and patched during Phase 1 execution (see Run Log).

The agent count axis was extended on April 29, 2026 to add tasks at n=5, 6, 7, 8 via shared builder pattern (`packages/tasks/src/n-agent-pipeline.ts`). Five-agent data collected at PRELIMINARY tier (n=7); six, seven, eight pending.

## What The Current Benchmark Does Not Test

Three variables are held fixed in ways that are not obvious from the published methodology. Each is an independent axis on which stigmergy's relative advantage plausibly depends.

### Turns per agent

Each agent in the current task definitions makes one or two API calls before handing off. The MCP protocol setup cost in Run C is paid on every call, with no opportunity for amortization. Real production agents typically loop for tens of turns before completing their slice of work. The benchmark therefore measures the worst case for stigmergy with respect to amortization.

### Handoff payload size

The amount of work product passed between agents is determined by prompt content and model output behavior. It is not a controlled variable. The benchmark cannot currently distinguish between tasks where the quadratic growth in Run B is large per step versus small per step.

### Trace verbosity

The stigmergy executor calls `deposit_trace` with the first 200 characters of agent output. This is hardcoded in `packages/executors/src/stigmergy-swarm.ts`. It is not parameterized as an experimental variable. Larger traces preserve more context but increase Run C content transfer; smaller traces reduce CT but may degrade task quality.

## The Five Axes That Should Be Tested

1. **Agent count.** Currently parameterized. Tasks exist at n=1 through 8 plus n=10. Range covers most practical cases.
2. **Turns per agent.** Currently fixed near 1 to 2. Should vary from 1 to roughly 50.
3. **Handoff payload size.** Currently uncontrolled. Should have small, medium, large variants per task.
4. **Trace verbosity.** Currently hardcoded at 200 characters. Should vary across at least three settings.
5. **Task type.** Already covered: sequential, parallel, iterative. Keep this axis as is.

## What Each Axis Reveals

**Agent count** isolates the quadratic-versus-linear scaling dynamic. This is the headline thesis test. Phase 1 confirms crossover lives between 3 and 5 agents on sequential tasks, with savings growing as agent count increases above the crossover.

**Turns per agent** isolates amortization. The MCP protocol overhead is fixed per call; spreading it across more calls per agent reduces effective per-task overhead. The thesis predicts that increasing turns shifts the crossover toward lower agent counts.

**Handoff payload size** isolates the rate of quadratic growth. Larger handoffs make message-passing more expensive faster; the crossover should shift toward lower agent counts as payload grows.

**Trace verbosity** tests whether stigmergy can be tuned. If the technique works only at one specific trace size, practical applicability is narrow. If it works across a range, deployers have flexibility.

**Task type** has already been shown to matter (sequential versus parallel coordination patterns produce different absolute numbers). Worth preserving for completeness.

## Phase Plan

### Phase 1: Single-Axis (in progress, near completion)

Demonstrates that crossover exists on the agent-count axis. Establishes methodology, executors, classifier, statistics framework. Sufficient for a methodology paper or positioning post.

Status: canonical FULL-tier result achieved at n=10 on April 28, 2026. Five-agent extension data obtained on April 29 (n=7, PRELIMINARY tier). Six, seven, and eight-agent runs pending API credit top-up.

To complete Phase 1:
- Six-agent-pipeline at n=10 FULL tier
- Seven-agent-pipeline at n=10 FULL tier
- Eight-agent-pipeline at n=10 FULL tier
- Optionally: top up five-agent-pipeline to n=10 FULL tier (currently n=7 PRELIMINARY)

Total estimated cost to complete: approximately $10-15 in API spend. Total estimated time: 5-7 hours of run time.

### Phase 2: Two-Axis Expansion (turns per agent)

Scope: add the turns-per-agent axis. Re-run a subset of existing tasks (research-report at 3 agents, ten-agent-pipeline at 10 agents) at multiple turn counts: 1, 5, 10, 25 turns per agent.

Cost estimate: API spend grows roughly linearly with turn count. At 10 trials per cell on Sonnet 4.5 pricing, expect single-digit hundreds of dollars to fill the grid.

Outcome: a two-dimensional surface showing crossover as a function of both agent count and turn count. Supports the amortization argument directly. This is the most strategically important phase, because amortization is what differentiates real deployments from toy benchmarks.

### Phase 3: Three-Axis Factorial (handoff payload)

Scope: add handoff payload size as small, medium, large variants of the existing tasks. Hold turns per agent at a representative value (likely 5 to 10).

Outcome: a clearer picture of when stigmergy applies in real deployments. Defensible practical applicability claim.

### Phase 4 (optional): Trace Verbosity Sensitivity

Scope: vary trace verbosity at the best operating point identified in Phase 3. Confirms whether stigmergy's win is robust to trace size or sensitive to specific tuning.

Outcome: tuning guidance for deployers.

## Decisions Required Before Phase 2

1. **Which model.** Sonnet 4.5 is the default for now. If publication-grade results are intended, decide whether to also run Opus 4.7 for comparison. Opus 4.7 requires a temperature-handling patch in the LLM client.
2. **Trial counts per cell.** PUBLICATION grade is 20+ trials. PRELIMINARY is 5 to 9. Multi-axis factorials grow expensive fast; 10 trials per cell is the practical default.
3. **Task selection.** Whether to extend all existing tasks across all axes or select a representative subset (likely research-report, ten-agent-pipeline, and code-review for iterative).
4. **Total budget.** A full three-axis factorial at 10 trials per cell across three tasks runs into the low-to-mid four-figure dollar range. Scope explicitly before committing.

## Framing For The Eventual Writeup

The current benchmark supports a methodology contribution and a directional finding (crossover exists between 3 and 5 agents on sequential tasks, savings of 46 percent at n=10 with p = 0.002). It does not yet support broad practical applicability claims. The Phase 1 publication should be honest about what it measures and explicit that the practical applicability argument depends on Phase 2 and Phase 3 results.

A skeptical reader cannot fault Phase 1 for not testing what it does not claim to test. A practical reader understands that the research direction is incomplete in a known way and that the next phase is designed to close the gap. This sequencing is more credible than presenting one cross-section as if it represented the whole.

**Specific recommendation for Phase 1 writeup:** Anchor the claim on the canonical n=10 run (FULL tier, p = 0.002) and use the agent-count curve as supporting evidence showing where the crossover lives. Position the result as conservative.

## Open Threads

### Methodology and statistics

- **Cross-validation in low-variance regimes. HIGH PRIORITY — BLOCKING PUBLICATION.** The cross-validation system flags low-variance regimes as UNRELIABLE. The calibration formula (Run A CV times 2) breaks down when Run A variance approaches zero on deterministic tasks at temperature 0. All three ten-agent-pipeline runs have Run A CV = 0.0 percent, which makes the threshold zero, and every trial trips the flag mechanically. The UNRELIABLE label on a result with p = 0.002 and tight CIs is a credibility liability that will confuse reviewers and readers. **Must be fixed before any external publication.** Proposed fix: add a minimum threshold floor (e.g., `Math.max(2 * runACV, 0.01)` or 1 percent absolute) below which the cross-validation defers to direct CI examination instead.

- **Effective Savings exceeds Inter-Agent Savings at n=5 but not at n=10. NEW.** At n=5, Effective Savings is 49.5 percent while Inter-Agent Savings is 34.8 percent. At n=10, the relationship inverts: Effective Savings is 30.1 percent while Inter-Agent Savings is 46.3 percent. The cause appears to be a large Task Reasoning gap at n=5 (Run B 50.5k vs Run C 21.1k tokens) that does not appear at n=10 (77.2k vs 75.9k, essentially equal). Possible explanations: (1) message-passing agents reasoning about predecessor outputs they receive, with reasoning cost saturating at higher N, (2) classifier categorizing different content as Task Reasoning at different agent counts, (3) task content variance between five-section and ten-section guides. Investigate before drawing strong conclusions about Task Reasoning behavior. **Medium-high priority.** Worth understanding before Phase 2.

- **CT Savings percentage decreases as agent count increases.** At n=5, Content Transfer Savings is 90.8 percent. At n=10, it is 71.9 percent. This is consistent with theory: Run C's CT also grows with agent count (each agent reads more traces), so the relative gap closes even as the absolute gap widens. The 5-agent absolute CT delta is 28.4k tokens (31.3k - 2.9k); the 10-agent absolute CT delta is 90.6k tokens (127.3k - 36.7k). Worth noting in the writeup. Plotting absolute CT delta vs agent count alongside percentage savings would show this clearly. **Documentation priority, not a fix.**

- **Run C Task Reasoning variance is consistently elevated.** Across runs at n=10, Run C Task Reasoning CV has been 12.7 percent, 27.5 percent, and 19.3 percent — consistently higher than Run B's 5.1 percent, 3.1 percent, and 13.1 percent. At n=5, Run C TR CV is 26.4 percent versus Run B's 11.9 percent. Pattern is stable across samples. Possible cause: stigmergy agents read traces that vary in length across trials, leading to varied reasoning inputs. Worth investigating during Phase 2. **Medium priority.**

- **Atomic message classification.** The classifier classifies whole messages atomically. The handoff message contains both coordination scaffolding and agent output; ideal classification would split tokens within a single message. Document as a known limitation.

- **MCP schema overhead dominance.** The MCP tool schemas dominate Run C overhead at low agent counts. Whether this is intrinsic to MCP or specific to the current schemas is worth investigating; smaller schemas would shift the crossover.

- **Worst-case framing.** The current benchmark measures the worst case for stigmergy (single-shot agents, uncontrolled handoff size). This is defensible methodologically but worth flagging explicitly in any external communication so readers understand that real deployments should perform better than the benchmark suggests, not worse.

- **Data archival policy.** Each significant run is exported and committed to `results/phase-1-data` branch with the commit hash citable in any writeup. Pattern established with `export-benchmark-data.sh`. Continue for Phase 2 and Phase 3 results.

### Engineering and reliability

- **API credit exhaustion is now a recurring failure mode.** Three of the last four planned runs have been interrupted by credit exhaustion mid-trial: ten-agent-pipeline first attempt (5 trials), ten-agent-pipeline second attempt (10 trials), and now five-agent-pipeline (10 trials). Each interruption wastes API budget on partial trials that are not aggregated and cannot be resumed cleanly. **Two parallel fixes needed:** (1) operator discipline — top up credits with substantial margin (estimate 2x expected cost) before launching long runs; (2) engineering — add a `--resume <comparison_id>` flag to the harness that supplements an existing comparison rather than starting fresh. **High priority for Phase 2** since multi-axis runs are even more expensive and credit interruptions there would be more costly.

- **Provider adapter sanitization.** All LLM client provider adapters need centralized sanitization to strip trailing whitespace from message content before API submission. The Anthropic adapter has been patched. Mock, OpenAI, Gemini, and Ollama adapters in `packages/llm-client/src/` should receive the same treatment for completeness. Future provider adapters should follow the same pattern.

- **Trial supplementation across sessions.** When a run is interrupted (API credit exhaustion, network failure), the harness creates a new comparison_result record on the next invocation rather than aggregating supplemental trials into the prior session. Workaround: top up credits and run all trials in one session. Real fix: add a `--resume <comparison_id>` flag that supplements an existing comparison.

- **Error handling at scale.** The benchmark currently aborts a trial on any API error. A 400 with a known retryable cause should sanitize and retry rather than fail the trial. Failing trials at agent count 10 burn through real API budget before the abort threshold triggers. Methodology improvement, not a blocker, but worth scoping for Phase 2 since longer turn counts will surface more edge cases.

- **API error message clarity.** Credit exhaustion errors are reported by the harness as generic "API error 400" with the underlying message buried. Worth surfacing the actual error reason at the harness level so users know to top up credits versus debug code.

- **Cost guardrails.** No upper bound on API spend per run. A misconfigured task or runaway loop could burn through budget unchecked. Worth adding a max-cost-per-run limit to the CLI.

- **CLI argument parsing.** Observed instance of `--trials 1` being interpreted as 3 trials. Reproduced on April 29 with the new six-agent-pipeline mock smoke test (also ran 3 trials despite `--trials 1`). Pattern is stable, suggests there may be a hardcoded minimum or default-fallback. Worth investigating; lower priority since does not affect FULL tier runs.

### Open data questions

- **Single-agent-null degradation between runs.** Inter-agent savings on single-agent-null moved from -37 percent on the first real-API run (3 trials, Sonnet 4) to -3803 percent on later runs (3-5 trials, Sonnet 4.5). The newer numbers are now understood to be structurally correct rather than degraded: with Run B inter-agent at ~88 tokens (just role assignment scaffolding) and Run C inter-agent at ~3.4k tokens (MCP protocol tax), the ratio explodes because the denominator is small. The original -37 percent figure may have been the anomaly; investigate whether classifier behavior on Sonnet 4 differed from Sonnet 4.5 enough to explain the gap. Lower priority now that the headline result is in.

## Run Log

Track significant runs and findings in chronological order. Append, do not overwrite.

### April 27, 2026 — Initial real-API runs and bug discovery

- **single-agent-null (3 trials, Sonnet 4):** Inter-agent savings -37 percent. Cross-validation flagged UNRELIABLE due to low-variance regime (Run A CV 12.6 percent, threshold too tight).
- **tiny-handoff (5 trials, Sonnet 4.5):** Inter-agent savings -2658 percent. Run B Content Transfer reported as 0 across all trials. Diagnostic flag: classifier was misclassifying handoff payload.
- **Bug 1 fixed: Classifier missing handoff marker.** Added `[content-transfer]` marker to handoff template and matching regex to CONTENT_TRANSFER_PATTERNS in `categories.ts`. Commit `cc90e66`.
- **tiny-handoff post-patch (3 trials):** Run B CT registered correctly at 93 tokens. Inter-agent savings -2581 percent. Stigmergy still loses at n=2 due to MCP protocol overhead being unamortized; this is consistent with theory.
- **Audit suite full sweep (5 trials each):**
  - single-agent-null: -3803 percent (initially flagged as degraded; later understood to be structurally correct due to small denominator).
  - tiny-handoff: -2600 percent (consistent with previous post-patch run).
  - research-report: -100 percent. CI includes positive territory ([-170, +6]). Crossover region is in this neighborhood.
  - ten-agent-pipeline: aborted. All three attempted trials failed with API 400 "final assistant content cannot end with trailing whitespace."

### April 27, 2026 — Trailing whitespace bug

- **Bug 2 discovered: trailing whitespace in assistant message content.** Anthropic API rejects multi-turn conversations where the final message content ends with whitespace. Fired probabilistically based on conversation length: rarely at 2-3 agents, reliably at 10. All three ten-agent-pipeline trials in audit suite aborted with HTTP 400.
- **Bug 2 fix attempt 1 (executor-level):** Patched message-passing.ts and stigmergy-swarm.ts to strip trailing whitespace from text blocks before pushing to message history. Missed single-agent.ts.
- **Bug 2 fix attempt 2 (single-agent):** Added the same patch to single-agent.ts. Single-agent-null ran cleanly. Ten-agent-pipeline still failed at 0 seconds elapsed.
- **Bug 2 fix attempt 3 (adapter-level):** Centralized sanitization in `AnthropicClient.complete()` via `sanitizeMessage` helper. Strips trailing whitespace from all text blocks and tool_result content blocks before request submission. This is the right architectural location for the fix.

### April 28, 2026 — Headline run (first sample)

- **ten-agent-pipeline first attempt (5 trials):** Trials 1 and 2 completed cleanly with adapter-level fix in place. Trials 3-5 failed due to API credit exhaustion. Two-trial result showed inter-agent savings of 57.8 percent (RAW_ONLY tier).
- **ten-agent-pipeline second attempt (10 trials, n=7 successful):** Trials 1-7 completed cleanly. Trials 8-10 failed due to API credit exhaustion (second occurrence). Seven-trial result is the first headline finding:
  - Inter-Agent Savings: 53.4 percent, CI [40.0, 64.6]
  - Effective Savings: 33.4 percent, CI [24.3, 50.2]
  - Content Transfer Savings: 76.7 percent, CI [73.2, 82.8]
  - PRELIMINARY tier (5-9 trials).
  - Cross-validation flagged UNRELIABLE due to Run A variance = 0.0 percent (deterministic regime). See open threads.
- Result ID: `c80a64be-716e-4cd4-aa1a-b206e2578b52`

### April 28, 2026 — Reproducibility confirmation (second sample)

- **ten-agent-pipeline third attempt (3 trials, all successful):** Independent run after credit top-up. All three trials completed cleanly:
  - Inter-Agent Savings: 55.3 percent, CI [53.2, 58.8]
  - Effective Savings: 43.2 percent, CI [31.8, 48.9]
  - Content Transfer Savings: 79.2 percent, CI [78.5, 86.8]
  - PROVISIONAL tier (3-4 trials).
- Result ID: `0215a934-0852-4bdb-93e7-a65ffef67416`

**Cross-run synthesis (Runs 1 and 2):** Two independent samples converged on inter-agent savings of 53-55 percent and content transfer savings of 77-79 percent.

### April 28, 2026 — Data archival

- **Created `results/phase-1-data` branch** for offsite preservation of benchmark data.
- **Built `export-benchmark-data.sh`** to export SQLite to CSVs plus gzipped database snapshot.
- **Committed Phase 1 results to data branch:** all audit results, both ten-agent-pipeline outputs, full token_usage CSV export, comparison_results CSV, trial_subtotals CSV, gzipped database snapshot, schema DDL, and manifest.
- **Established pattern:** code branch (`claude/copy-benchmark-files-PhLGC`) holds tooling and bug fixes; data branch holds results and exports.

### April 28, 2026 — Canonical FULL-tier run (publication-grade)

- **ten-agent-pipeline fourth attempt (10 trials, all successful):** Single uninterrupted session after API credit top-up. **This is the canonical Phase 1 result.**
  - Inter-Agent Savings: 46.3 percent, CI [38.0, 53.5], **Wilcoxon p = 0.002**
  - Effective Savings: 30.1 percent, CI [20.0, 37.5], **Wilcoxon p = 0.002**
  - Content Transfer Savings: 71.9 percent, CI [67.2, 76.0]
  - **FULL tier** (10-19 trials).
  - First run with formal hypothesis test results. p = 0.002 indicates the probability of observing this difference under the null hypothesis is roughly 1 in 500.
- Run B inter-agent total: 129.4k tokens (CT 127.3k).
- Run C inter-agent total: 70.4k tokens (CT 36.7k + MO 25.5k + CI 8.1k).
- Task Reasoning: 77.2k vs 75.9k (1.7 percent delta, within noise).
- Result ID: `c8e5cfb5-574b-4ffc-b0ad-7d0a3823cf00`

**Cross-run synthesis (all three n=10 samples):** Three independent samples (n=7, n=3, n=10) confirm the directional finding with overlapping confidence intervals. The canonical Run 3 has the lowest central tendency, the most rigorous methodology, and the only formal hypothesis test, making it the appropriate anchor for public claims.

### April 29, 2026 — Code branch extension via coding agent

- **Coding agent task delegated:** add pipeline tasks for agent counts 5, 6, 7, 8 to fill in the crossover curve between n=3 and n=10. Sub-branch workflow used to isolate agent's work from parent branch.
- **Implementation:** shared builder function `buildNAgentPipeline(n)` in `n-agent-pipeline.ts`, with thin wrapper files `t07-five-agent.ts` through `t10-eight-agent.ts`. Six files total, +88 lines.
- **Verification:** all 10 tasks register correctly. Mock-provider smoke tests pass on all four new tasks. Build clean.
- **Merge:** sub-branch `claude/add-pipeline-tasks-5-to-8` merged into `claude/copy-benchmark-files-PhLGC` via merge commit `ff7a03d`. Sub-branch deleted.
- Agent commit: `2e72fea`. Co-authored attribution to Claude Opus 4.7.

### April 29, 2026 — Five-agent extension run (first new data point)

- **five-agent-pipeline (10 trials attempted, n=7 successful):** Trials 1-7 completed cleanly. Trials 8-10 failed due to API credit exhaustion (third occurrence in Phase 1). Seven-trial result is the first positive savings datum below n=10:
  - Inter-Agent Savings: 34.8 percent, CI [30.2, 51.4]
  - Effective Savings: 49.5 percent, CI [46.5, 57.6]
  - Content Transfer Savings: 90.8 percent, CI [89.8, 93.5]
  - PRELIMINARY tier (5-9 trials).
- Run B inter-agent total: 32.5k tokens (CT 31.3k).
- Run C inter-agent total: 20.9k tokens (CT 2.9k + MO 13.9k + CI 4.1k).
- **Anomaly:** Task Reasoning shows a 58 percent gap between Run B (50.5k) and Run C (21.1k), unlike the n=10 case where the two are essentially equal. See new open thread on Effective Savings inversion.
- **Anomaly:** CT Savings of 90.8 percent at n=5 is higher than 71.9 percent at n=10 in percentage terms but smaller in absolute tokens (28.4k delta vs 90.6k delta). See new open thread.
- Result ID: `5ed581a5-9d1b-4e18-83df-b82b50551a5c`

**Cross-axis synthesis:** With n=5 and n=10 results both positive and the n=3 confidence interval crossing zero, the crossover lives between agent counts 3 and 5. Most likely close to 4. Six, seven, and eight-agent runs will tighten this localization.

## Next Step

1. **Top up Anthropic API credits with substantial margin.** Estimate $20 to comfortably complete six, seven, eight-agent runs at FULL tier in one chained session. Credit exhaustion has interrupted three of the last four planned runs.
2. **Run six, seven, eight-agent extension benchmarks** in a chained command so credit failure stops the sequence cleanly:
   ```
   compare --task six-agent-pipeline --trials 10 ... && \
   compare --task seven-agent-pipeline --trials 10 ... && \
   compare --task eight-agent-pipeline --trials 10 ...
   ```
3. **Optionally extend five-agent to n=10 FULL tier** if PUBLICATION-grade complete-curve data is desired. Current n=7 PRELIMINARY is informative but below FULL threshold.
4. **Fix cross-validation low-variance regime issue.** This is now BLOCKING publication. The UNRELIABLE flag on a p = 0.002 result is incoherent and will confuse reviewers. Add a threshold floor to the calibration formula. Estimate: 30 minutes of work.
5. **Investigate Effective Savings inversion** between n=5 and n=10. The Task Reasoning gap at n=5 that disappears at n=10 is unexplained and may reveal something useful about how the architectures differ at small versus large agent counts.
6. **Begin Phase 1 writeup** once cross-validation fix is in and the agent-count curve is complete (8 data points: n=1, 2, 3, 5, 6, 7, 8, 10). Anchor on n=10 canonical, supporting curve from agent-count axis.
7. **Apply adapter sanitization to other provider adapters** (Mock, OpenAI, Gemini, Ollama) for completeness and consistency.
8. **Begin scoping Phase 2** — turns per agent — after Phase 1 writeup is done. The amortization axis is the next research priority.
