import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { execSync } from 'child_process';
import { existsSync, unlinkSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, resolve } from 'path';
import { tmpdir } from 'os';

const REPO_ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..', '..', '..');
const CLI = `node ${resolve(REPO_ROOT, 'packages/cli/dist/index.js')}`;
const TEST_DB = resolve(tmpdir(), 'e2e-benchmark-test.db');

function run(cmd: string): string {
  return execSync(`${CLI} ${cmd}`, {
    cwd: REPO_ROOT,
    encoding: 'utf-8',
    timeout: 30_000,
    env: { ...process.env, STIGMERGY_BENCHMARK_DB: TEST_DB },
  });
}

describe('CLI E2E', () => {
  beforeAll(() => {
    if (existsSync(TEST_DB)) unlinkSync(TEST_DB);
  });

  afterAll(() => {
    if (existsSync(TEST_DB)) unlinkSync(TEST_DB);
  });

  // ──────────────────────────────────────────────
  // Version & Help
  // ──────────────────────────────────────────────

  it('prints version', () => {
    const output = run('--version');
    expect(output.trim()).toMatch(/^\d+\.\d+\.\d+$/);
  });

  it('prints help', () => {
    const output = run('--help');
    expect(output).toContain('stigmergy-benchmark');
    expect(output).toContain('compare');
    expect(output).toContain('tasks');
    expect(output).toContain('results');
  });

  it('prints compare help', () => {
    const output = run('compare --help');
    expect(output).toContain('--task');
    expect(output).toContain('--trials');
    expect(output).toContain('--provider');
    expect(output).toContain('--skip-single-agent');
  });

  // ──────────────────────────────────────────────
  // Tasks
  // ──────────────────────────────────────────────

  it('lists all 10 tasks', () => {
    const output = run('tasks list');
    expect(output).toContain('Available Benchmark Tasks');
    expect(output).toContain('research-report');
    expect(output).toContain('multi-source-analysis');
    expect(output).toContain('code-review');
    expect(output).toContain('single-agent-null');
    expect(output).toContain('tiny-handoff');
    expect(output).toContain('ten-agent-pipeline');
    expect(output).toContain('five-agent-pipeline');
    expect(output).toContain('six-agent-pipeline');
    expect(output).toContain('seven-agent-pipeline');
    expect(output).toContain('eight-agent-pipeline');
    expect(output).toContain('10 tasks available');
  });

  // ──────────────────────────────────────────────
  // Compare (full pipeline)
  // ──────────────────────────────────────────────

  let comparisonId: string;

  it('runs a 3-trial comparison against mock provider', () => {
    const output = run(`compare --task research-report --trials 3 --provider mock --db ${TEST_DB}`);

    // Header
    expect(output).toContain('Stigmergy-MCP Token Comparison');
    expect(output).toContain('Research Report Pipeline');
    expect(output).toContain('mock-model (mock)');
    expect(output).toContain('Trials: 3');

    // Progress
    expect(output).toContain('Trial 1/3');
    expect(output).toContain('Trial 3/3');
    expect(output).toContain('complete');

    // Statistical output sections
    expect(output).toContain('AUTONOMOUS FLOOR');
    expect(output).toContain('TOKEN DECOMPOSITION');
    expect(output).toContain('Content Transfer');
    expect(output).toContain('Mechanism Overhead');
    expect(output).toContain('Task Reasoning');
    expect(output).toContain('STATISTICAL ANALYSIS');
    expect(output).toContain('Inter-Agent Savings');
    expect(output).toContain('VARIANCE PROFILE');
    expect(output).toContain('CROSS-VALIDATION');

    // Headline summary
    expect(output).toContain('INTER-AGENT SAVINGS');
    expect(output).toContain('EFFECTIVE SAVINGS');

    // Result saved
    expect(output).toContain('Result saved:');
    const match = output.match(/Result saved: ([a-f0-9-]+)/);
    expect(match).not.toBeNull();
    comparisonId = match![1];
  });

  it('runs with --skip-single-agent flag', () => {
    const output = run(
      `compare --task single-agent-null --trials 3 --provider mock --db ${TEST_DB} --skip-single-agent`,
    );
    expect(output).toContain('Result saved:');
  });

  // ──────────────────────────────────────────────
  // Results persistence & retrieval
  // ──────────────────────────────────────────────

  it('lists past results', () => {
    const output = run(`results list --db ${TEST_DB}`);
    expect(output).toContain('Past Comparison Results');
    expect(output).toContain('Research Report Pipeline');
    expect(output).toContain('results');
  });

  it('shows a result by full ID', () => {
    const output = run(`results show ${comparisonId} --db ${TEST_DB}`);
    expect(output).toContain('Research Report Pipeline');
    expect(output).toContain('TOKEN DECOMPOSITION');
  });

  it('shows a result by prefix ID', () => {
    const prefix = comparisonId.slice(0, 8);
    const output = run(`results show ${prefix} --db ${TEST_DB}`);
    expect(output).toContain('Research Report Pipeline');
  });

  // ──────────────────────────────────────────────
  // Error handling
  // ──────────────────────────────────────────────

  it('errors on missing --task', () => {
    expect(() => run('compare --provider mock')).toThrow();
  });

  it('errors on unknown task', () => {
    expect(() => run('compare --task nonexistent --provider mock')).toThrow();
  });

  it('errors on unknown command', () => {
    expect(() => run('frobnicate')).toThrow();
  });
});
