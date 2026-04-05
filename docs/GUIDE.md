# Stigmergy Benchmark — End-to-End Guide

A complete walkthrough for running benchmark comparisons and viewing results, from first install to interpreting statistical output.

---

## Table of Contents

1. [Prerequisites](#prerequisites)
2. [Installation & Build](#installation--build)
3. [Quick Start (5 Minutes)](#quick-start-5-minutes)
4. [Available Benchmark Tasks](#available-benchmark-tasks)
5. [Running Benchmarks via CLI](#running-benchmarks-via-cli)
6. [Viewing Results via CLI](#viewing-results-via-cli)
7. [Web Dashboard](#web-dashboard)
8. [Understanding the Results](#understanding-the-results)
9. [Docker Deployment](#docker-deployment)
10. [Environment Variables Reference](#environment-variables-reference)
11. [Troubleshooting](#troubleshooting)

---

## Prerequisites

| Requirement | Minimum Version | Notes                                                    |
| ----------- | --------------- | -------------------------------------------------------- |
| Node.js     | 20+             | Tested on 20 and 22                                      |
| pnpm        | 9+              | Used for monorepo workspace management                   |
| API Key     | —               | Only needed for real LLM providers (Anthropic or OpenAI) |

Optional for Docker deployment:

- Docker Engine 20+
- Docker Compose v2

---

## Installation & Build

```bash
# 1. Clone the repository
git clone https://github.com/calabamatex/stigmergy-mcp-benchmark.git
cd stigmergy-mcp-benchmark

# 2. Install all dependencies
pnpm install

# 3. Build all 10 packages
pnpm build
```

The build compiles TypeScript for all backend packages and bundles the React dashboard frontend with Vite.

To verify everything is working:

```bash
# Run the full test suite (169 tests)
pnpm test
```

---

## Quick Start (5 Minutes)

Run a benchmark with the mock LLM provider — no API keys needed:

```bash
# List available tasks
node packages/cli/dist/index.js tasks list

# Run a comparison: 3 trials, mock provider
node packages/cli/dist/index.js compare --task research-report --trials 3 --provider mock

# View the result
node packages/cli/dist/index.js results list
node packages/cli/dist/index.js results show <id>
```

The mock provider simulates realistic token distributions with configurable variance, allowing you to validate the pipeline end-to-end before spending money on real API calls.

---

## Available Benchmark Tasks

Six tasks test different multi-agent coordination patterns:

| ID                      | Name                     | Agents | Category   | Crossover | Purpose                                              |
| ----------------------- | ------------------------ | ------ | ---------- | --------- | ---------------------------------------------------- |
| `research-report`       | Research Report Pipeline | 3      | Sequential | No        | Tests content transfer growth in sequential handoffs |
| `multi-source-analysis` | Multi-Source Analysis    | 4      | Parallel   | No        | Tests parallel fan-out + synthesis patterns          |
| `code-review`           | Iterative Code Review    | 3      | Iterative  | No        | Tests iterative refinement patterns                  |
| `single-agent-null`     | Single Agent (Null)      | 1      | —          | No        | Validates instrumentation (~0% savings expected)     |
| `tiny-handoff`          | Two-Agent Tiny Handoff   | 2      | Sequential | Yes       | Crossover detection (TOST equivalence)               |
| `ten-agent-pipeline`    | Ten-Agent Pipeline       | 10     | Sequential | No        | Tests extreme O(N^2) vs O(N) scaling                 |

**Crossover tasks** test whether stigmergy and message-passing produce equivalent results. They require at least 15 trials for adequate TOST statistical power.

---

## Running Benchmarks via CLI

### The `compare` Command

```bash
node packages/cli/dist/index.js compare --task <id> [options]
```

### All CLI Options

| Flag                  | Default                    | Description                                         |
| --------------------- | -------------------------- | --------------------------------------------------- |
| `--task <id>`         | _(required)_               | Task ID from the table above                        |
| `--trials <n>`        | `10`                       | Number of trials (minimum 3)                        |
| `--provider <p>`      | `mock`                     | LLM provider: `mock`, `anthropic`, or `openai`      |
| `--model <m>`         | per provider               | Model name override (see defaults below)            |
| `--temperature <t>`   | `0`                        | Sampling temperature (0–2)                          |
| `--skip-single-agent` | `false`                    | Skip Run A (faster, but disables cross-validation)  |
| `--seed <n>`          | —                          | Fixed PRNG seed for reproducibility (mock provider) |
| `--db <path>`         | `./stigmergy-benchmark.db` | SQLite database file path                           |
| `--verbose`           | `false`                    | Show per-call token breakdown                       |

### Default Models by Provider

| Provider    | Default Model              |
| ----------- | -------------------------- |
| `anthropic` | `claude-sonnet-4-20250514` |
| `openai`    | `gpt-4o`                   |
| `mock`      | `mock-model`               |

### Example Commands

**Mock provider (quick validation):**

```bash
node packages/cli/dist/index.js compare --task research-report --trials 3 --provider mock
```

**Anthropic Claude (real API):**

```bash
ANTHROPIC_API_KEY=sk-ant-... node packages/cli/dist/index.js compare \
  --task research-report \
  --trials 10 \
  --provider anthropic
```

**OpenAI GPT-4o (real API):**

```bash
OPENAI_API_KEY=sk-... node packages/cli/dist/index.js compare \
  --task research-report \
  --trials 10 \
  --provider openai \
  --model gpt-4o
```

**Reproducible mock run with a fixed seed:**

```bash
node packages/cli/dist/index.js compare \
  --task research-report \
  --trials 5 \
  --provider mock \
  --seed 123
```

**Fast run skipping the single-agent baseline:**

```bash
node packages/cli/dist/index.js compare \
  --task research-report \
  --trials 5 \
  --provider mock \
  --skip-single-agent
```

### What Happens During a Run

Each trial executes the same task through three architectures:

1. **Run A — Single Agent:** One agent solves the task alone (autonomous floor)
2. **Run B — Message-Passing Swarm:** Agents share cumulative conversation history
3. **Run C — Stigmergy Swarm:** Agents coordinate via stigmergy-mcp traces

The CLI displays real-time progress with ETA:

```
Stigmergy-MCP Token Comparison
Task: Research Report Pipeline  |  Model: mock-model (mock)  |  Trials: 10
──────────────────────────────────────────────────────────────────────────

Trial 3/10  [=====>             ] 0m12s (B) running
  Provisional stats: inter-agent savings -42.1% (95% CI: -55.3% to -18.2%), p=0.0023
```

After all trials complete, the result is automatically saved to the SQLite database. The CLI prints the result ID for later reference.

### Cost Estimates for Real API Usage

| Task              | Trials  | Estimated Cost (Sonnet) |
| ----------------- | ------- | ----------------------- |
| `research-report` | 3       | ~$1                     |
| `research-report` | 10      | ~$3–5                   |
| All 6 tasks       | 10 each | ~$20–40                 |

**Recommendation:** Start with `--task research-report --trials 3 --provider anthropic` (~$1) to validate the pipeline before scaling up.

---

## Viewing Results via CLI

### List All Past Results

```bash
node packages/cli/dist/index.js results list
```

Displays a table of all saved comparisons with ID, task name, trial count, and timestamp.

### Show Detailed Results

```bash
node packages/cli/dist/index.js results show <id>
```

The `<id>` parameter supports **prefix matching** — you only need to type enough characters to uniquely identify a result (e.g., `a1f3` instead of the full UUID).

The detailed view shows:

- Token decomposition across all 5 categories for Runs A, B, and C
- Inter-agent savings with 95% confidence intervals
- Content transfer savings with CIs
- Effective savings with CIs
- Wilcoxon signed-rank test p-values
- Variance profile (coefficient of variation) per category
- Cross-validation reliability status

### Custom Database Path

If you stored results in a non-default location:

```bash
node packages/cli/dist/index.js results list --db /path/to/my-results.db
node packages/cli/dist/index.js results show <id> --db /path/to/my-results.db
```

---

## Web Dashboard

The dashboard provides a browser-based interface for running benchmarks and exploring results visually.

### Starting the Dashboard

```bash
# Make sure the project is built first
pnpm build

# Start the server
node packages/dashboard/dist/server.js
```

The dashboard opens at **http://localhost:3456**.

To use a custom port or database:

```bash
PORT=8080 STIGMERGY_BENCHMARK_DB=/path/to/results.db node packages/dashboard/dist/server.js
```

### Dashboard Views

The interface has four views, accessible via the navigation bar:

#### 1. Tasks View

The landing page. Shows all 6 benchmark tasks as cards with:

- Task name and description
- Agent count, category, and difficulty
- Crossover status

**Configuration controls** at the top:

- **Trials** — number slider (3–20)
- **Provider** — dropdown: Mock, Anthropic, or OpenAI

Click **"Run Comparison"** on any task card to start a benchmark. The view automatically switches to the Live view.

> **Note:** When using Anthropic or OpenAI providers, the corresponding API key must be set as an environment variable when starting the dashboard server:
>
> ```bash
> ANTHROPIC_API_KEY=sk-ant-... node packages/dashboard/dist/server.js
> ```

#### 2. Live View

Displays real-time progress while a benchmark is running:

- **Progress bar** showing completed trials out of total
- **Per-trial updates** as each trial's three runs complete
- **Provisional statistics** showing running averages of inter-agent savings
- **Final results** when all trials finish
- **Error messages** if any trial fails

The Live view uses WebSocket for real-time updates. A green "WS Connected" indicator in the header confirms the connection is active.

> **Note:** Only one comparison can run at a time. If you try to start a second, the server returns a 409 Conflict error.

#### 3. History View

Lists all past comparison results stored in the database:

- Task name
- Trial count
- Timestamp

Click any result to navigate to the Detail view.

#### 4. Detail View

The full analysis of a single comparison result:

**Summary Cards (top row):**
Three metric cards showing:

- **Inter-Agent Savings** — percentage reduction in coordination tokens (CT + MO + CI), with 95% confidence interval and Wilcoxon p-value
- **Content Transfer Savings** — percentage reduction in content transfer tokens alone, with CI
- **Effective Savings** — net total token savings, with CI

**Token Distribution Chart:**
A stacked bar chart comparing Run B (message-passing) vs Run C (stigmergy) across 5 token categories:

- Content Transfer (CT)
- Mechanism Overhead (MO)
- Coordination Instructions (CI)
- Task Reasoning (TR)
- System Identity (SI)

**Cross-Validation Section:**

- Run A variance (CV) — the baseline for reliability assessment
- Calibrated threshold (2x Run A CV)
- Number of flagged trials for Runs B and C
- Overall reliability verdict: **RELIABLE** or **UNRELIABLE**

**Variance Profile Table:**
Coefficient of variation (CV) for each token category in Runs B and C. High CV in a category indicates inconsistent token usage across trials.

### Dashboard + CLI Shared Database

The dashboard and CLI share the same SQLite database. Results created via the CLI are visible in the dashboard's History view, and vice versa. Just ensure both use the same `--db` path or `STIGMERGY_BENCHMARK_DB` environment variable.

---

## Understanding the Results

### The Three Run Types

| Run   | Architecture          | What It Measures                                                               |
| ----- | --------------------- | ------------------------------------------------------------------------------ |
| **A** | Single Agent          | Autonomous cost floor — how many tokens one agent needs with zero coordination |
| **B** | Message-Passing Swarm | Control — agents pass full conversation history; content transfer grows O(N^2) |
| **C** | Stigmergy Swarm       | Experimental — agents read/write stigmergy traces; content transfer grows O(N) |

### The Five Token Categories

Every API token is classified into exactly one category:

| Category                      | Abbreviation | What It Measures                               | Inter-Agent? |
| ----------------------------- | ------------ | ---------------------------------------------- | ------------ |
| **Content Transfer**          | CT           | Work product passed between agents             | Yes          |
| **Mechanism Overhead**        | MO           | Tool definitions, tool calls, protocol framing | Yes          |
| **Coordination Instructions** | CI           | Prompts directing inter-agent behavior         | Yes          |
| **Task Reasoning**            | TR           | Agent's thinking and task-specific output      | No           |
| **System Identity**           | SI           | Base system prompt                             | No           |

**Inter-agent tokens** (CT + MO + CI) are the coordination cost. The benchmark hypothesis is that stigmergy reduces these compared to message-passing.

**Autonomous tokens** (TR + SI) are the floor cost — they don't change significantly between architectures.

### Key Metrics

- **Inter-Agent Savings** = (Run B inter-agent tokens - Run C inter-agent tokens) / Run B inter-agent tokens. The primary metric. Negative values mean stigmergy uses fewer tokens.
- **Content Transfer Savings** = same formula for CT tokens only. Usually the largest component of savings.
- **Effective Savings** = total token savings including autonomous tokens. Always smaller than inter-agent savings because TR and SI are roughly constant.

### Statistical Reporting Levels

Results mature as you add more trials:

| Level           | Trials | What You Get                                       |
| --------------- | ------ | -------------------------------------------------- |
| **RAW_ONLY**    | < 3    | Invalid — minimum 3 trials required                |
| **PROVISIONAL** | 3–4    | Point estimates only, no confidence intervals      |
| **PRELIMINARY** | 5–9    | Point estimates + bootstrap confidence intervals   |
| **FULL**        | 10–19  | Full suite: CIs + Wilcoxon signed-rank test        |
| **PUBLICATION** | 20+    | Publication-ready with high statistical confidence |

### Reading Confidence Intervals

A 95% CI of [-48.2%, -31.4%] for inter-agent savings means: "We are 95% confident the true savings lies between 31.4% and 48.2%."

If the CI does not cross zero, the result is statistically significant.

### Reading P-Values

The Wilcoxon signed-rank p-value tests whether the difference between Run B and Run C is statistically significant:

- **p < 0.05** — significant difference (marked with a checkmark)
- **p >= 0.05** — no significant difference detected

### Cross-Validation

Run A (single agent) establishes a variance baseline. If Runs B or C show variance exceeding 2x Run A's coefficient of variation, those trials are flagged as potentially unreliable.

- **RELIABLE** — no excessive variance detected
- **UNRELIABLE** — some trials showed unexpected variance; interpret results with caution

---

## Docker Deployment

### Build the Docker Image

```bash
docker compose build
```

### Run with Mock Provider

```bash
docker compose run benchmark compare --task research-report --trials 3 --provider mock
```

### Run with Real API Keys

Edit `docker-compose.yml` to uncomment and set the API key environment variables:

```yaml
services:
  benchmark:
    environment:
      - STIGMERGY_BENCHMARK_DB=/data/stigmergy-benchmark.db
      - ANTHROPIC_API_KEY=${ANTHROPIC_API_KEY}
```

Then run:

```bash
ANTHROPIC_API_KEY=sk-ant-... docker compose run benchmark compare \
  --task research-report \
  --trials 10 \
  --provider anthropic
```

### Persisting Results

Results are stored in a Docker named volume (`benchmark-data`) mounted at `/data/`. They persist across container restarts.

To copy the database out of the volume:

```bash
# Find the container ID
docker ps -a

# Copy the database file
docker cp <container_id>:/data/stigmergy-benchmark.db ./results.db
```

---

## Environment Variables Reference

| Variable                 | Default                    | Description                         |
| ------------------------ | -------------------------- | ----------------------------------- |
| `ANTHROPIC_API_KEY`      | —                          | Required for `--provider anthropic` |
| `OPENAI_API_KEY`         | —                          | Required for `--provider openai`    |
| `STIGMERGY_BENCHMARK_DB` | `./stigmergy-benchmark.db` | SQLite database file path           |
| `PORT`                   | `3456`                     | Dashboard server port               |

Copy `.env.example` to `.env` and fill in your values:

```bash
cp .env.example .env
# Edit .env with your API keys
```

---

## Troubleshooting

### "Unknown provider" error

```
Error: Unknown provider: anthropic. Use: mock | anthropic | openai
```

Make sure the `--provider` flag value is exactly one of: `mock`, `anthropic`, `openai` (case-sensitive).

### API key not found

If the Anthropic or OpenAI client throws an authentication error, ensure the API key is set in the environment:

```bash
# Option 1: Inline
ANTHROPIC_API_KEY=sk-ant-... node packages/cli/dist/index.js compare ...

# Option 2: Export
export ANTHROPIC_API_KEY=sk-ant-...
node packages/cli/dist/index.js compare ...

# Option 3: .env file (for dashboard)
echo "ANTHROPIC_API_KEY=sk-ant-..." >> .env
```

### Build errors

```bash
# Clean and rebuild
pnpm install
pnpm build
```

If TypeScript errors persist, ensure you're on Node.js 20+:

```bash
node --version  # Should be v20.x or v22.x
```

### Port 3456 already in use

```bash
# Use a different port
PORT=8080 node packages/dashboard/dist/server.js
```

Or find and stop the process using port 3456:

```bash
lsof -i :3456
kill <PID>
```

### Database locked

If you see a "database locked" error, ensure only one process is writing to the database at a time. The CLI and dashboard can share the same database file, but running two simultaneous comparisons against the same database may cause conflicts.

### Crossover task warning

```
Warning: Task "Two-Agent Tiny Handoff" is a crossover task. TOST requires n >= 15 for adequate power (you set 5).
```

Crossover tasks need at least 15 trials for the TOST equivalence test to have adequate statistical power. Increase `--trials` to 15 or more.

### Dashboard WebSocket not connecting

If the "WS Connected" indicator doesn't appear:

1. Check that the dashboard server is running
2. Verify you're accessing it via the correct port
3. Check for firewall or proxy issues blocking WebSocket connections
4. Try refreshing the browser
