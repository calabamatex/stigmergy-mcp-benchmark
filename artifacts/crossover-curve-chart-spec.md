# Crossover Curve Chart: Specification & Data Collection Plan

**Purpose:** Specify the headline visualization for Phase 1 of the stigmergy-mcp benchmark, and provide the commands needed to fill in the missing data points (agent counts 5, 6, 7, 8) before publishing.

**Status:** Spec ready. Data collection pending. Estimated additional API spend: $5-10. Estimated additional run time: 4-6 hours.

---

## The Chart

A line chart showing inter-agent token consumption versus number of agents, with two lines (Run B: message-passing, Run C: stigmergy) plotted on the same axes. The crossover point — where the lines intersect — is the visual centerpiece of the Phase 1 finding.

### Axes

- **X-axis:** Number of agents (linear scale, range 1 to 10)
- **Y-axis:** Inter-agent tokens (linear scale, log scale acceptable as alternative if values span more than 2 orders of magnitude)
  - Inter-agent tokens = Content Transfer + Mechanism Overhead + Coordination Instructions
  - This is the value labeled "Subtotal" under "INTER-AGENT COMMUNICATION" in the harness output

### Lines

Two solid lines, each with markers at every measured agent count:

1. **Run B (Message-passing):** the control line. Use a warm color (red or orange). Plot the median value at each agent count.
2. **Run C (Stigmergy):** the experimental line. Use a cool color (blue or teal). Plot the median value at each agent count.

### Confidence intervals

Shade a translucent band around each line representing the 95 percent confidence interval at each point. Use a low-opacity version of the line color (alpha 0.2-0.3). This makes the statistical confidence visible without cluttering the chart.

### Annotations

- **Crossover point:** Mark the visual intersection of the two lines with a vertical dashed line and a label like "Crossover ≈ 4 agents" (final value depends on data collection).
- **Canonical result callout:** At the n=10 data point, add a small annotation pointing to Run C's value: "46.3% reduction at 10 agents (p = 0.002)".
- **Sample size labels:** Below each x-axis tick, indicate the trial count used for that data point: "n=10" at agent count 10, "n=10" at fill-in points, etc.

### Title and labels

- **Title:** "Inter-Agent Token Consumption: Message-Passing vs Stigmergy"
- **Subtitle:** "Sequential pipeline tasks, Claude Sonnet 4.5, temperature 0"
- **X-axis label:** "Number of agents"
- **Y-axis label:** "Inter-agent tokens (median)"
- **Legend:** Top-right or upper-left, whichever has more clear space
- **Caption (below chart):** "Shaded bands show 95% bootstrap confidence intervals across n trials per agent count. Stigmergy reduces inter-agent token consumption above approximately 4 agents, with a 46% reduction at 10 agents (Wilcoxon p = 0.002, n=10)."

---

## Current Data Available

These data points already exist in SQLite from Phase 1 runs and can be plotted immediately.

| Agent Count | n | Run B (median tokens) | Run C (median tokens) | Source Run |
|-------------|---|----------------------|----------------------|------------|
| 1 | 5 | 88 | 3,400 | single-agent-null audit run |
| 2 | 5 | 289 | 7,706 | tiny-handoff audit run |
| 3 | 5 | ~3,900 | ~3,500 | research-report audit run |
| 10 | 10 | 129,400 | 70,400 | canonical Phase 1 run |

(Values for agent count 3 are approximate; exact medians need to be re-extracted from SQLite. Run the export script and pull from `trial_subtotals.csv`.)

The gap between agent counts 3 and 10 is large. Without data in the middle, the crossover location is estimated visually and weakens the visual story. The middle of the curve is precisely where the crossover lives, so filling it in is the highest-value extension.

---

## Data Collection Commands

Run each of these in sequence from the repo root with `ANTHROPIC_API_KEY` set. Each produces a separate comparison_result record at FULL tier (n=10) for one agent count.

### Prerequisites

1. Confirm credits topped up. Estimate roughly $1.50-2.50 per agent count run.
2. Confirm code branch is current and built:
   ```bash
   git checkout claude/copy-benchmark-files-PhLGC
   git pull
   pnpm build
   ```
3. Confirm patches are in place:
   ```bash
   grep -q '\[content-transfer\]' packages/classifier/src/categories.ts && echo "OK: classifier patch"
   grep -q 'sanitizeMessage' packages/llm-client/src/anthropic.ts && echo "OK: adapter patch"
   ```

### Required: new tasks at agent counts 5, 6, 7, 8

The current task registry has tasks at agent counts 1, 2, 3, 4, and 10. Tasks at 5, 6, 7, 8 do not exist yet. Create them by extending `packages/tasks/src/` following the pattern of `t06-ten-agent.ts`. Each new task is roughly 30 lines, varying only in `agentCount`, the number of `steps` generated, and the `userPrompt` (which should describe a coordination task with that many distinct sections).

Suggested approach: parameterize the existing ten-agent task generator. Replace the hardcoded `length: 10` with a function argument and create thin wrappers for each agent count. Keep the task content semantically equivalent across counts (each task is "write a guide with N sections").

After adding the tasks, register them in `packages/tasks/src/registry.ts`, then rebuild:

```bash
pnpm build
```

### Run commands

Once tasks exist:

```bash
# Agent count 5
node packages/cli/dist/index.js compare \
  --task five-agent-pipeline \
  --trials 10 \
  --provider anthropic \
  --model claude-sonnet-4-5 \
  2>&1 | tee phase-1-five-agent.txt

# Agent count 6
node packages/cli/dist/index.js compare \
  --task six-agent-pipeline \
  --trials 10 \
  --provider anthropic \
  --model claude-sonnet-4-5 \
  2>&1 | tee phase-1-six-agent.txt

# Agent count 7
node packages/cli/dist/index.js compare \
  --task seven-agent-pipeline \
  --trials 10 \
  --provider anthropic \
  --model claude-sonnet-4-5 \
  2>&1 | tee phase-1-seven-agent.txt

# Agent count 8
node packages/cli/dist/index.js compare \
  --task eight-agent-pipeline \
  --trials 10 \
  --provider anthropic \
  --model claude-sonnet-4-5 \
  2>&1 | tee phase-1-eight-agent.txt
```

Each run takes roughly 1-2 hours. Run sequentially, not in parallel, to avoid rate limits and to keep cost predictable.

### After all four runs

Export the data and commit to the results branch:

```bash
./export-benchmark-data.sh
git checkout results/phase-1-data
git add benchmark-exports/ phase-1-*-agent.txt
git commit --no-verify -m "chore(data): Phase 1 extension runs at agent counts 5-8 (FULL tier)"
git push origin results/phase-1-data
```

---

## Generating the Chart

Once all data is collected, the chart can be generated several ways. Pick whichever fits your workflow.

### Option 1: Python with matplotlib (flexible, scriptable)

```python
import sqlite3
import matplotlib.pyplot as plt
import numpy as np

DB = "stigmergy-benchmark.db"

# Pull median inter-agent tokens per agent count per run type
query = """
SELECT
  json_extract(c.config_data, '$.agentCount') AS agent_count,
  t.run_type,
  CAST(SUM(CASE WHEN t.category IN
    ('CONTENT_TRANSFER','MECHANISM_OVERHEAD','COORDINATION_INSTRUCTIONS')
    THEN t.total_tokens ELSE 0 END) AS REAL) AS inter_agent_total,
  COUNT(DISTINCT t.trial_index) AS n_trials
FROM token_usage t
JOIN comparison_results c ON ... -- adapt to actual schema
WHERE t.run_type IN ('message_passing', 'stigmergy')
GROUP BY agent_count, t.run_type;
"""

# Plot as described in the spec above.
# Use matplotlib's fill_between for confidence interval bands.
```

### Option 2: Node.js with Chart.js or Recharts (web-friendly)

If the chart needs to live in a web page or dashboard, the project already has Chart.js available as a dependency in the React artifact stack. Build a small React component that pulls from the exported CSV and renders the chart.

### Option 3: Spreadsheet-based (fastest, least flexible)

Open `benchmark-exports/<latest>/trial_subtotals.csv` in a spreadsheet, pivot to get medians per agent count per run type, and use the built-in line chart with confidence interval bands (Excel and Google Sheets both support this with some manual data preparation).

For publication: prefer Option 1. The matplotlib output is reproducible, version-controllable, and produces vector graphics that scale cleanly.

---

## Quality Bar

Before publishing the chart, verify:

- [ ] All data points come from FULL tier runs (n ≥ 10) or are clearly marked as preliminary
- [ ] Confidence interval bands are computed from bootstrap percentile method, matching the harness output
- [ ] The crossover point label specifies the value with appropriate precision (e.g., "≈ 4 agents" if uncertain, "between 3 and 4" if data warrants)
- [ ] The canonical result (46.3 percent at 10 agents) is annotated explicitly
- [ ] The caption mentions the model, temperature, task category (sequential), and number of trials
- [ ] The chart looks correct on a small screen (mobile preview)

---

## Variations Worth Producing

After the primary chart, consider these supporting visualizations:

1. **Token decomposition stacked bar.** Run B versus Run C at n=10, broken into the five categories. Shows where the tokens go.
2. **Distribution plot.** Box plot or violin plot of inter-agent savings across the 10 trials of the canonical run. Shows the result is not a single-trial fluke.
3. **Same chart with log-scale Y-axis.** If absolute values span more than 2 orders of magnitude, log scale makes the relative behavior clearer at low agent counts.
4. **Component breakdown overlay.** Same X-axis (agent count) but show CT, MO, and CI as separate lines for each run type. This makes the architectural argument: Run B's CT explodes while Run C's MO grows linearly.

The primary crossover chart is the headline. The variations are supporting evidence that can appear in a methodology section or appendix.
