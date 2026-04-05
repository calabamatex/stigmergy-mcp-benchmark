import { ReportingLevel, RunType, type AggregatedStats } from '@stigmergy-benchmark/core';

const BAR_FULL = '\u2501'; // ━
const BAR_EMPTY = '\u2500'; // ─
const BAR_WIDTH = 25;

const RUN_LABELS: Record<string, string> = {
  [RunType.SINGLE_AGENT]: 'A',
  [RunType.MESSAGE_PASSING]: 'B',
  [RunType.STIGMERGY]: 'C',
};

/**
 * Tracks timing across trials for ETA calculation.
 */
export class ProgressTracker {
  private startTime: number = Date.now();
  private trialTimes: number[] = [];
  private currentTrialStart: number = Date.now();

  onTrialStart(): void {
    this.currentTrialStart = Date.now();
  }

  onTrialComplete(): void {
    this.trialTimes.push(Date.now() - this.currentTrialStart);
  }

  getElapsed(): number {
    return Date.now() - this.startTime;
  }

  getEta(completedTrials: number, totalTrials: number): number | null {
    if (completedTrials === 0) return null;
    const avgMs = this.trialTimes.reduce((a, b) => a + b, 0) / this.trialTimes.length;
    return avgMs * (totalTrials - completedTrials);
  }
}

export function formatProgressLine(
  trialIndex: number,
  totalTrials: number,
  status: 'running' | 'complete',
  tracker?: ProgressTracker,
  currentRun?: RunType,
): string {
  const num = `Trial ${trialIndex + 1}/${totalTrials}`;
  const progress = (trialIndex + (status === 'complete' ? 1 : 0.5)) / totalTrials;
  const filled = Math.round(progress * BAR_WIDTH);
  const bar = BAR_FULL.repeat(filled) + BAR_EMPTY.repeat(BAR_WIDTH - filled);

  let label: string;
  if (status === 'complete') {
    label = 'complete';
  } else if (currentRun) {
    label = `run ${RUN_LABELS[currentRun] ?? currentRun}...`;
  } else {
    label = 'running...';
  }

  let timing = '';
  if (tracker) {
    const elapsed = formatDuration(tracker.getElapsed());
    if (status === 'complete' && trialIndex + 1 < totalTrials) {
      const eta = tracker.getEta(trialIndex + 1, totalTrials);
      if (eta !== null) {
        timing = `  ${elapsed} elapsed, ~${formatDuration(eta)} remaining`;
      }
    } else {
      timing = `  ${elapsed} elapsed`;
    }
  }

  return `${num} ${bar} ${label}${timing}`;
}

export function formatProvisionalStats(stats: AggregatedStats): string | null {
  const { reportingLevel, interAgentSavings } = stats;
  const median = interAgentSavings.median;

  switch (reportingLevel) {
    case ReportingLevel.RAW_ONLY:
      return null;

    case ReportingLevel.PROVISIONAL:
      return `Provisional: inter-agent savings median ${fmtPct(median)} (CIs unavailable, n < 5)`;

    case ReportingLevel.PRELIMINARY: {
      const ci = interAgentSavings.ci;
      return `Preliminary: inter-agent savings median ${fmtPct(median)} CI [${fmtPct(ci.lower)}, ${fmtPct(ci.upper)}] (n < 10)`;
    }

    case ReportingLevel.FULL:
    case ReportingLevel.PUBLICATION: {
      const ci = interAgentSavings.ci;
      return `inter-agent savings median ${fmtPct(median)} CI [${fmtPct(ci.lower)}, ${fmtPct(ci.upper)}]`;
    }

    default:
      return null;
  }
}

function fmtPct(n: number): string {
  if (isNaN(n)) return 'N/A';
  return `${n.toFixed(1)}%`;
}

function formatDuration(ms: number): string {
  const seconds = Math.round(ms / 1000);
  if (seconds < 60) return `${seconds}s`;
  const minutes = Math.floor(seconds / 60);
  const secs = seconds % 60;
  return `${minutes}m${secs.toString().padStart(2, '0')}s`;
}
