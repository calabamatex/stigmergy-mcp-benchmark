CREATE TABLE token_usage (
    id TEXT PRIMARY KEY,
    run_id TEXT NOT NULL,
    trial_index INTEGER NOT NULL,
    agent_id TEXT NOT NULL,
    request_id TEXT NOT NULL,
    category TEXT NOT NULL,
    input_tokens INTEGER NOT NULL,
    output_tokens INTEGER NOT NULL,
    total_tokens INTEGER NOT NULL,
    cached_input_tokens INTEGER NOT NULL DEFAULT 0,
    provider TEXT NOT NULL,
    model TEXT NOT NULL,
    timestamp INTEGER NOT NULL,
    run_type TEXT NOT NULL,
    cache_hit INTEGER NOT NULL DEFAULT 0
  );
CREATE TABLE trial_results (
    id TEXT PRIMARY KEY,
    comparison_id TEXT NOT NULL,
    trial_index INTEGER NOT NULL,
    single_agent_data TEXT NOT NULL,
    message_passing_data TEXT NOT NULL,
    stigmergy_data TEXT NOT NULL,
    cross_validation_data TEXT NOT NULL
  );
CREATE TABLE comparison_results (
    id TEXT PRIMARY KEY,
    task_id TEXT NOT NULL,
    task_name TEXT NOT NULL,
    timestamp INTEGER NOT NULL,
    config_data TEXT NOT NULL,
    stats_data TEXT NOT NULL,
    calibration_data TEXT NOT NULL,
    trial_count INTEGER NOT NULL
  );
CREATE INDEX idx_tokens_run ON token_usage(run_id);
CREATE INDEX idx_tokens_trial ON token_usage(run_id, trial_index);
CREATE INDEX idx_trials_comparison ON trial_results(comparison_id);
CREATE INDEX idx_comparisons_task ON comparison_results(task_id);
