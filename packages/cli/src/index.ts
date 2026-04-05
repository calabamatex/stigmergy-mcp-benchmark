#!/usr/bin/env node

import { Command } from 'commander';
import { runCompare } from './commands/run.js';
import { listTasksCommand, listResultsCommand } from './commands/list.js';
import { showResultCommand } from './commands/show.js';

const program = new Command();

program
  .name('stigmergy-benchmark')
  .description('Empirical token usage comparison — stigmergic vs message-passing coordination')
  .version('0.1.0');

// tasks list
const tasks = program.command('tasks');
tasks
  .command('list')
  .description('List available benchmark tasks')
  .action(() => listTasksCommand());

// compare
program
  .command('compare')
  .description('Run a comparison benchmark')
  .requiredOption('--task <id>', 'Task to benchmark')
  .option('--trials <n>', 'Number of trials (min: 3)', '10')
  .option('--provider <provider>', 'LLM provider: mock | anthropic | openai', 'mock')
  .option('--model <model>', 'Model name (default: per provider)')
  .option('--temperature <t>', 'Temperature', '0')
  .option('--skip-single-agent', 'Skip Run A (faster, no cross-validation)')
  .option('--seed <n>', 'Fixed PRNG seed for reproducibility')
  .option('--db <path>', 'SQLite database path', process.env.STIGMERGY_BENCHMARK_DB ?? './stigmergy-benchmark.db')
  .option('--verbose', 'Per-call token breakdown')
  .action(async (opts) => {
    await runCompare({
      task: opts.task,
      trials: opts.trials,
      provider: opts.provider,
      model: opts.model,
      temperature: opts.temperature,
      skipSingleAgent: opts.skipSingleAgent ?? false,
      seed: opts.seed,
      db: opts.db,
      verbose: opts.verbose ?? false,
    });
  });

// results list / results show
const results = program.command('results');
results
  .command('list')
  .description('List past comparison results')
  .option('--db <path>', 'SQLite database path', process.env.STIGMERGY_BENCHMARK_DB ?? './stigmergy-benchmark.db')
  .action((opts) => listResultsCommand(opts.db));

results
  .command('show <id>')
  .description('Show detailed results for a comparison')
  .option('--db <path>', 'SQLite database path', process.env.STIGMERGY_BENCHMARK_DB ?? './stigmergy-benchmark.db')
  .action((id, opts) => showResultCommand(id, opts.db));

// Parse and run
program.parse();
