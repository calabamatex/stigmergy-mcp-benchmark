#!/usr/bin/env bash
#
# run-benchmark-suite.sh
#
# Automates the full audit and benchmark sequence for stigmergy-mcp-benchmark.
# Runs from the repo root.
#
# Usage:
#   export ANTHROPIC_API_KEY=sk-ant-...
#   ./run-benchmark-suite.sh
#
# Output goes to ./audit-results/<timestamp>/

set -euo pipefail

# ── Config ────────────────────────────────────────────────────────────────────
MODEL="${MODEL:-claude-sonnet-4-5}"
PROVIDER="${PROVIDER:-anthropic}"
TRIALS="${TRIALS:-5}"
DB="${DB:-./stigmergy-benchmark.db}"
OUTDIR="./audit-results/$(date +%Y%m%d-%H%M%S)"
CLI="node packages/cli/dist/index.js"

mkdir -p "$OUTDIR"
exec > >(tee -a "$OUTDIR/run.log") 2>&1

echo "========================================================================"
echo "Stigmergy Benchmark Audit + Run Suite"
echo "Model:    $MODEL"
echo "Provider: $PROVIDER"
echo "Trials:   $TRIALS"
echo "Output:   $OUTDIR"
echo "Started:  $(date)"
echo "========================================================================"

# ── Pre-flight ────────────────────────────────────────────────────────────────
echo
echo "── Pre-flight ────────────────────────────────────────────────────────────"

if [[ -z "${ANTHROPIC_API_KEY:-}" && "$PROVIDER" == "anthropic" ]]; then
  echo "ERROR: ANTHROPIC_API_KEY not set"
  exit 1
fi

if [[ ! -f "package.json" ]]; then
  echo "ERROR: must run from repo root (no package.json found)"
  exit 1
fi

echo "Branch:       $(git branch --show-current)"
echo "Last commit:  $(git log -1 --oneline)"
echo "Dirty files:  $(git status --porcelain | wc -l | tr -d ' ')"

# ── Build ─────────────────────────────────────────────────────────────────────
echo
echo "── Build ─────────────────────────────────────────────────────────────────"
pnpm build > "$OUTDIR/build.log" 2>&1
echo "Build complete (log: $OUTDIR/build.log)"

# ── Code audit: savings formula and attribution ───────────────────────────────
echo
echo "── Audit: savings formula ────────────────────────────────────────────────"
{
  echo "=== grep: savings calculation ==="
  grep -rn "interAgentSavings\|effectiveSavings\|computeSavings\|savings" \
    packages/stats/src packages/engine/src 2>/dev/null || true
  echo
  echo "=== grep: token attribution (runType usage) ==="
  grep -rn "runType\|RunType\." packages/llm-client/src 2>/dev/null || true
} > "$OUTDIR/audit-grep.txt"
echo "Saved to $OUTDIR/audit-grep.txt ($(wc -l < "$OUTDIR/audit-grep.txt") lines)"

# ── Audit: classifier patch in place ──────────────────────────────────────────
echo
echo "── Audit: classifier fix verification ───────────────────────────────────"
if grep -q 'content-transfer' packages/classifier/src/categories.ts; then
  echo "OK: [content-transfer] marker present in classifier"
else
  echo "WARN: classifier patch not detected — Run B CT may be misclassified"
fi
if grep -q 'content-transfer' packages/executors/src/agent-prompt.ts; then
  echo "OK: handoff template emits [content-transfer] marker"
else
  echo "WARN: handoff template not patched — CT detection will fail"
fi

# ── Benchmark runs ────────────────────────────────────────────────────────────
run_task() {
  local task="$1"
  local trials="$2"
  local label="$3"
  echo
  echo "── Run: $label ($task, n=$trials) ──"
  local outfile="$OUTDIR/${task}-n${trials}.txt"
  $CLI compare \
    --task "$task" \
    --trials "$trials" \
    --provider "$PROVIDER" \
    --model "$MODEL" \
    --db "$DB" \
    > "$outfile" 2>&1 || {
      echo "FAILED — see $outfile"
      return 1
    }
  echo "Saved to $outfile"
  grep -E "INTER-AGENT SAVINGS|EFFECTIVE SAVINGS|Result saved" "$outfile" || true
}

echo
echo "════════════════════════════════════════════════════════════════════════"
echo "BENCHMARK SUITE"
echo "════════════════════════════════════════════════════════════════════════"

run_task "single-agent-null"  "$TRIALS"  "Validator (null hypothesis)"
run_task "tiny-handoff"       "$TRIALS"  "Two-agent crossover"
run_task "research-report"    "$TRIALS"  "Three-agent sequential"
run_task "ten-agent-pipeline" "$TRIALS"  "Ten-agent scaling test"

# ── SQLite raw data extraction ────────────────────────────────────────────────
echo
echo "── Raw data export ──────────────────────────────────────────────────────"

# Recent comparison results
sqlite3 "$DB" <<SQL > "$OUTDIR/comparisons.csv" 2>/dev/null
.headers on
.mode csv
SELECT
  id,
  task_id,
  task_name,
  datetime(timestamp/1000, 'unixepoch') AS run_time,
  trial_count
FROM comparison_results
ORDER BY timestamp DESC
LIMIT 20;
SQL
echo "Recent comparisons → $OUTDIR/comparisons.csv"

# Token usage breakdown by run type and category (last 24h)
sqlite3 "$DB" <<SQL > "$OUTDIR/token-breakdown.csv" 2>/dev/null
.headers on
.mode csv
SELECT
  run_type,
  category,
  COUNT(*) AS api_calls,
  SUM(input_tokens) AS total_input,
  SUM(output_tokens) AS total_output,
  SUM(total_tokens) AS total_tokens,
  ROUND(AVG(total_tokens), 1) AS avg_per_call
FROM token_usage
WHERE timestamp > (strftime('%s', 'now') - 86400) * 1000
GROUP BY run_type, category
ORDER BY run_type, total_tokens DESC;
SQL
echo "Token breakdown by run/category (last 24h) → $OUTDIR/token-breakdown.csv"

# Per-trial inter-agent subtotals — for hand-checking the savings math
sqlite3 "$DB" <<SQL > "$OUTDIR/trial-subtotals.csv" 2>/dev/null
.headers on
.mode csv
SELECT
  run_id,
  trial_index,
  run_type,
  SUM(CASE WHEN category = 'content_transfer' THEN total_tokens ELSE 0 END) AS ct_tokens,
  SUM(CASE WHEN category = 'mechanism_overhead' THEN total_tokens ELSE 0 END) AS mo_tokens,
  SUM(CASE WHEN category = 'coordination_instructions' THEN total_tokens ELSE 0 END) AS ci_tokens,
  SUM(CASE WHEN category IN ('content_transfer','mechanism_overhead','coordination_instructions') THEN total_tokens ELSE 0 END) AS inter_agent_subtotal,
  SUM(CASE WHEN category = 'task_reasoning' THEN total_tokens ELSE 0 END) AS tr_tokens,
  SUM(total_tokens) AS grand_total
FROM token_usage
WHERE timestamp > (strftime('%s', 'now') - 86400) * 1000
GROUP BY run_id, trial_index, run_type
ORDER BY run_id, trial_index, run_type;
SQL
echo "Per-trial subtotals (last 24h) → $OUTDIR/trial-subtotals.csv"

# Sanity check: did Run B Content Transfer register?
echo
echo "── Sanity check: Run B Content Transfer (last 24h) ──────────────────────"
sqlite3 "$DB" <<SQL
.mode column
.headers on
SELECT
  run_type,
  category,
  COUNT(*) AS calls,
  SUM(total_tokens) AS tokens
FROM token_usage
WHERE run_type = 'message_passing'
  AND category = 'content_transfer'
  AND timestamp > (strftime('%s', 'now') - 86400) * 1000;
SQL

# ── Summary ──────────────────────────────────────────────────────────────────
echo
echo "════════════════════════════════════════════════════════════════════════"
echo "SUMMARY"
echo "════════════════════════════════════════════════════════════════════════"
echo
for f in "$OUTDIR"/*-n*.txt; do
  [[ -f "$f" ]] || continue
  echo "── $(basename "$f" .txt) ──"
  grep -E "INTER-AGENT SAVINGS|EFFECTIVE SAVINGS|Classification:" "$f" | head -5
  echo
done

echo "Finished: $(date)"
echo "All artifacts in: $OUTDIR"
echo
echo "Files of interest:"
echo "  $OUTDIR/run.log               — full transcript"
echo "  $OUTDIR/audit-grep.txt        — savings formula source review"
echo "  $OUTDIR/comparisons.csv       — recent comparison runs"
echo "  $OUTDIR/token-breakdown.csv   — tokens by run_type × category"
echo "  $OUTDIR/trial-subtotals.csv   — per-trial inter-agent math (audit-ready)"
