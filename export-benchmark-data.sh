#!/usr/bin/env bash
#
# export-benchmark-data.sh
#
# Exports all benchmark data from SQLite to timestamped CSV files for backup,
# version control, and sharing. Run periodically to snapshot results.
#
# Usage:
#   ./export-benchmark-data.sh
#
# Output: ./benchmark-exports/<timestamp>/

set -euo pipefail

DB="${DB:-./stigmergy-benchmark.db}"
OUTDIR="./benchmark-exports/$(date +%Y%m%d-%H%M%S)"
mkdir -p "$OUTDIR"

echo "Exporting benchmark data from $DB to $OUTDIR"

# Full token usage table — one row per API call
sqlite3 "$DB" <<SQL > "$OUTDIR/token_usage.csv"
.headers on
.mode csv
SELECT * FROM token_usage ORDER BY timestamp;
SQL
echo "  token_usage.csv ($(wc -l < "$OUTDIR/token_usage.csv") rows)"

# All comparison runs with metadata
sqlite3 "$DB" <<SQL > "$OUTDIR/comparison_results.csv"
.headers on
.mode csv
SELECT
  id,
  task_id,
  task_name,
  datetime(timestamp/1000, 'unixepoch') AS run_time,
  trial_count,
  config_data,
  stats_data,
  calibration_data
FROM comparison_results
ORDER BY timestamp;
SQL
echo "  comparison_results.csv ($(wc -l < "$OUTDIR/comparison_results.csv") rows)"

# All individual trials
sqlite3 "$DB" <<SQL > "$OUTDIR/trial_results.csv"
.headers on
.mode csv
SELECT * FROM trial_results;
SQL
echo "  trial_results.csv ($(wc -l < "$OUTDIR/trial_results.csv") rows)"

# Pre-aggregated subtotals — most useful for analysis
sqlite3 "$DB" <<SQL > "$OUTDIR/trial_subtotals.csv"
.headers on
.mode csv
SELECT
  run_id,
  trial_index,
  run_type,
  datetime(MIN(timestamp)/1000, 'unixepoch') AS trial_time,
  SUM(CASE WHEN category = 'CONTENT_TRANSFER' THEN total_tokens ELSE 0 END) AS ct_tokens,
  SUM(CASE WHEN category = 'MECHANISM_OVERHEAD' THEN total_tokens ELSE 0 END) AS mo_tokens,
  SUM(CASE WHEN category = 'COORDINATION_INSTRUCTIONS' THEN total_tokens ELSE 0 END) AS ci_tokens,
  SUM(CASE WHEN category IN ('CONTENT_TRANSFER','MECHANISM_OVERHEAD','COORDINATION_INSTRUCTIONS') THEN total_tokens ELSE 0 END) AS inter_agent_subtotal,
  SUM(CASE WHEN category = 'TASK_REASONING' THEN total_tokens ELSE 0 END) AS tr_tokens,
  SUM(CASE WHEN category = 'SYSTEM_IDENTITY' THEN total_tokens ELSE 0 END) AS si_tokens,
  SUM(total_tokens) AS grand_total,
  COUNT(*) AS api_calls
FROM token_usage
GROUP BY run_id, trial_index, run_type
ORDER BY trial_time, run_id, run_type;
SQL
echo "  trial_subtotals.csv ($(wc -l < "$OUTDIR/trial_subtotals.csv") rows)"

# Database file itself, gzipped
gzip -c "$DB" > "$OUTDIR/stigmergy-benchmark.db.gz"
echo "  stigmergy-benchmark.db.gz ($(du -h "$OUTDIR/stigmergy-benchmark.db.gz" | cut -f1))"

# Schema for reproducibility
sqlite3 "$DB" .schema > "$OUTDIR/schema.sql"
echo "  schema.sql"

# Manifest with environment info
cat > "$OUTDIR/manifest.txt" <<EOF
Export timestamp: $(date)
Source database:  $DB
Database size:    $(du -h "$DB" | cut -f1)
Git branch:       $(git branch --show-current 2>/dev/null || echo "(not in git repo)")
Git commit:       $(git log -1 --format=%H 2>/dev/null || echo "(no commit)")
Hostname:         $(hostname)

Tables exported:
  - token_usage:        per-API-call token records
  - comparison_results: aggregated run-level results
  - trial_results:      individual trial records
  - trial_subtotals:    pre-aggregated per-trial subtotals (derived view)

Files:
  - *.csv files are UTF-8 with header rows
  - schema.sql contains DDL for reproducing the database
  - stigmergy-benchmark.db.gz is the full SQLite file, compressed
EOF
echo "  manifest.txt"

echo
echo "Export complete: $OUTDIR"
echo "Total size: $(du -sh "$OUTDIR" | cut -f1)"
