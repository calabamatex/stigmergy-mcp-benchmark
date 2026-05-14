# Phase 1 canonical rerun — did not execute

`phase-1-canonical-rerun.txt` is the captured stdout/stderr of an attempted
rerun of the Phase 1 canonical comparison (Ten-Agent Pipeline, claude-sonnet-4-5,
n=10). The run aborted before any trials executed because
`ANTHROPIC_API_KEY` was not set in the environment:

```
Error: ANTHROPIC_API_KEY is required
    at new AnthropicClient (.../packages/llm-client/dist/anthropic.js:36:19)
```

Committed as-is for transparency — evidence the rerun was attempted but did
not produce data. **No token_usage, comparison_results, or trial_results rows
in the SQLite database can be attributed to this attempt.** The canonical
Phase 1 data of record remains the n=10 run captured in
[phase-1-canonical-run.txt](phase-1-canonical-run.txt) and the
`benchmark-exports/20260428-130723/` snapshot.

A successful rerun (with the API key set) would replace this file.
