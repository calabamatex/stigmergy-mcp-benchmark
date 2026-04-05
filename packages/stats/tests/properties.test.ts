import { describe, it, expect } from 'vitest';
import {
  SeededRandom,
  bootstrapCI,
  mean,
  median,
  stdDev,
  percentile,
  cv,
  computeDescriptiveStats,
  wilcoxonSignedRank,
  tostEquivalence,
} from '../src/index.js';

/**
 * Property-based tests for statistical functions.
 *
 * These verify mathematical invariants that must hold for ALL valid inputs,
 * not just specific test cases. Critical for a scientific benchmarking tool
 * where statistical correctness determines result validity.
 */

// Helper: generate random data arrays with a seeded PRNG
function generateData(rng: SeededRandom, n: number, min = 0, max = 100): number[] {
  return Array.from({ length: n }, () => min + rng.next() * (max - min));
}

function generateSignedData(rng: SeededRandom, n: number, center = 0, spread = 50): number[] {
  return Array.from({ length: n }, () => center + (rng.next() - 0.5) * 2 * spread);
}

// ============================================================
// Descriptive Statistics Properties
// ============================================================

describe('Descriptive stats: mathematical properties', () => {
  const rng = new SeededRandom(12345);
  const datasets = Array.from({ length: 20 }, () =>
    generateData(rng, 5 + Math.floor(rng.next() * 50)),
  );

  it('mean is always between min and max', () => {
    for (const data of datasets) {
      const m = mean(data);
      expect(m).toBeGreaterThanOrEqual(Math.min(...data));
      expect(m).toBeLessThanOrEqual(Math.max(...data));
    }
  });

  it('median is always between min and max', () => {
    for (const data of datasets) {
      const med = median(data);
      expect(med).toBeGreaterThanOrEqual(Math.min(...data));
      expect(med).toBeLessThanOrEqual(Math.max(...data));
    }
  });

  it('stdDev is always non-negative', () => {
    for (const data of datasets) {
      expect(stdDev(data)).toBeGreaterThanOrEqual(0);
    }
  });

  it('stdDev is zero for constant data', () => {
    for (let i = 0; i < 10; i++) {
      const val = rng.next() * 1000;
      const constant = Array(10).fill(val);
      expect(stdDev(constant)).toBe(0);
    }
  });

  it('cv is always non-negative', () => {
    for (const data of datasets) {
      expect(cv(data)).toBeGreaterThanOrEqual(0);
    }
  });

  it('percentile(50) equals median', () => {
    for (const data of datasets) {
      expect(percentile(data, 50)).toBeCloseTo(median(data), 10);
    }
  });

  it('percentile is monotonically non-decreasing', () => {
    for (const data of datasets) {
      const p25 = percentile(data, 25);
      const p50 = percentile(data, 50);
      const p75 = percentile(data, 75);
      expect(p50).toBeGreaterThanOrEqual(p25);
      expect(p75).toBeGreaterThanOrEqual(p50);
    }
  });

  it('IQR bounds are valid in descriptive stats', () => {
    for (const data of datasets) {
      const stats = computeDescriptiveStats(data, { resamples: 100, ciLevel: 0.95, seed: 99 });
      const [lower, upper] = stats.iqr;
      expect(lower).toBeLessThanOrEqual(upper);
      expect(lower).toBeGreaterThanOrEqual(stats.min);
      expect(upper).toBeLessThanOrEqual(stats.max);
    }
  });

  it('mean of a single value is that value', () => {
    for (let i = 0; i < 20; i++) {
      const v = rng.next() * 1000 - 500;
      expect(mean([v])).toBe(v);
    }
  });

  it('adding a constant shifts mean by that constant', () => {
    for (const data of datasets) {
      const c = rng.next() * 100;
      const shifted = data.map((v) => v + c);
      expect(mean(shifted)).toBeCloseTo(mean(data) + c, 8);
    }
  });

  it('scaling by a constant scales stdDev by |constant|', () => {
    for (const data of datasets) {
      const c = rng.next() * 5 + 0.1; // positive scalar
      const scaled = data.map((v) => v * c);
      expect(stdDev(scaled)).toBeCloseTo(stdDev(data) * c, 6);
    }
  });
});

// ============================================================
// Bootstrap CI Properties
// ============================================================

describe('Bootstrap CI: mathematical properties', () => {
  const rng = new SeededRandom(54321);

  it('CI always has lower <= upper', () => {
    for (let i = 0; i < 20; i++) {
      const data = generateData(rng, 5 + Math.floor(rng.next() * 30));
      const ci = bootstrapCI(data, { resamples: 1000, ciLevel: 0.95, seed: i });
      expect(ci.lower).toBeLessThanOrEqual(ci.upper);
    }
  });

  it('CI contains the sample median for symmetric data', () => {
    for (let i = 0; i < 15; i++) {
      const center = rng.next() * 100;
      // Generate symmetric data around center
      const halfN = 5 + Math.floor(rng.next() * 10);
      const half = Array.from({ length: halfN }, () => rng.next() * 20);
      const symmetric = [...half.map((v) => center - v), ...half.map((v) => center + v)];

      const ci = bootstrapCI(symmetric, { resamples: 5000, ciLevel: 0.95, seed: i });
      const med = median(symmetric);
      expect(ci.lower).toBeLessThanOrEqual(med + 1e-10);
      expect(ci.upper).toBeGreaterThanOrEqual(med - 1e-10);
    }
  });

  it('wider CI level produces wider or equal interval', () => {
    for (let i = 0; i < 10; i++) {
      const data = generateData(rng, 10 + Math.floor(rng.next() * 20));
      const ci90 = bootstrapCI(data, { resamples: 5000, ciLevel: 0.9, seed: i });
      const ci95 = bootstrapCI(data, { resamples: 5000, ciLevel: 0.95, seed: i });
      const ci99 = bootstrapCI(data, { resamples: 5000, ciLevel: 0.99, seed: i });

      const width90 = ci90.upper - ci90.lower;
      const width95 = ci95.upper - ci95.lower;
      const width99 = ci99.upper - ci99.lower;

      // Allow small numerical tolerance
      expect(width95).toBeGreaterThanOrEqual(width90 - 1e-10);
      expect(width99).toBeGreaterThanOrEqual(width95 - 1e-10);
    }
  });

  it('CI is reproducible with same seed', () => {
    for (let i = 0; i < 10; i++) {
      const data = generateData(rng, 10);
      const a = bootstrapCI(data, { resamples: 1000, ciLevel: 0.95, seed: 777 });
      const b = bootstrapCI(data, { resamples: 1000, ciLevel: 0.95, seed: 777 });
      expect(a.lower).toBe(b.lower);
      expect(a.upper).toBe(b.upper);
    }
  });
});

// ============================================================
// Wilcoxon Signed-Rank Properties
// ============================================================

describe('Wilcoxon signed-rank: mathematical properties', () => {
  const rng = new SeededRandom(99999);

  it('p-value is always in [0, 1]', () => {
    for (let i = 0; i < 30; i++) {
      const n = 5 + Math.floor(rng.next() * 25);
      const diffs = generateSignedData(rng, n);
      const result = wilcoxonSignedRank(diffs);
      expect(result.pValue).toBeGreaterThanOrEqual(0);
      expect(result.pValue).toBeLessThanOrEqual(1);
    }
  });

  it('all-positive differences yield significant result for n >= 5', () => {
    for (let n = 5; n <= 15; n++) {
      const diffs = Array.from({ length: n }, () => 10 + rng.next() * 90);
      const result = wilcoxonSignedRank(diffs);
      // All positive — should be significant or at least have low p
      expect(result.pValue).toBeLessThan(0.1);
    }
  });

  it('negating all differences produces same p-value', () => {
    for (let i = 0; i < 20; i++) {
      const n = 5 + Math.floor(rng.next() * 15);
      const diffs = generateSignedData(rng, n);
      const resultPos = wilcoxonSignedRank(diffs);
      const resultNeg = wilcoxonSignedRank(diffs.map((d) => -d));
      expect(resultPos.pValue).toBeCloseTo(resultNeg.pValue, 10);
    }
  });

  it('scaling differences by positive constant preserves significance', () => {
    for (let i = 0; i < 15; i++) {
      const n = 6 + Math.floor(rng.next() * 15);
      const diffs = generateSignedData(rng, n);
      const scale = 1 + rng.next() * 99; // scale > 0
      const resultOrig = wilcoxonSignedRank(diffs);
      const resultScaled = wilcoxonSignedRank(diffs.map((d) => d * scale));
      // Rank-based test: scaling preserves ranks, so results should be identical
      expect(resultScaled.pValue).toBeCloseTo(resultOrig.pValue, 10);
      expect(resultScaled.significant).toBe(resultOrig.significant);
    }
  });

  it('all zeros returns p = 1', () => {
    for (let n = 1; n <= 10; n++) {
      const result = wilcoxonSignedRank(Array(n).fill(0));
      expect(result.pValue).toBe(1);
      expect(result.significant).toBe(false);
    }
  });

  it('statistic is non-negative', () => {
    for (let i = 0; i < 20; i++) {
      const n = 5 + Math.floor(rng.next() * 20);
      const diffs = generateSignedData(rng, n);
      const result = wilcoxonSignedRank(diffs);
      expect(result.statistic).toBeGreaterThanOrEqual(0);
    }
  });
});

// ============================================================
// TOST Equivalence Properties
// ============================================================

describe('TOST equivalence: mathematical properties', () => {
  const rng = new SeededRandom(77777);

  it('p-value is always in [0, 1]', () => {
    for (let i = 0; i < 20; i++) {
      const n = 5 + Math.floor(rng.next() * 30);
      const diffs = generateSignedData(rng, n, 0, 10);
      const result = tostEquivalence(diffs, 5);
      expect(result.pValue).toBeGreaterThanOrEqual(0);
      expect(result.pValue).toBeLessThanOrEqual(1);
    }
  });

  it('data far from zero fails equivalence', () => {
    for (let i = 0; i < 10; i++) {
      // Data centered at 50 — far outside ±5% margin
      const n = 15 + Math.floor(rng.next() * 15);
      const diffs = Array.from({ length: n }, () => 50 + rng.next() * 10);
      const result = tostEquivalence(diffs, 5);
      expect(result.significant).toBe(false);
    }
  });

  it('wider margin makes equivalence easier to establish', () => {
    // Generate data tightly centered near zero
    const n = 20;
    const diffs = Array.from({ length: n }, () => (rng.next() - 0.5) * 2);

    const narrow = tostEquivalence(diffs, 2);
    const wide = tostEquivalence(diffs, 20);

    // Wider margin should have equal or lower p-value
    expect(wide.pValue).toBeLessThanOrEqual(narrow.pValue + 1e-10);
  });

  it('includes power warning for n < 15', () => {
    const diffs = generateSignedData(rng, 10, 0, 1);
    const result = tostEquivalence(diffs, 5);
    expect(result.interpretation).toContain('inadequate power');
  });
});

// ============================================================
// PRNG Properties
// ============================================================

describe('SeededRandom: statistical properties', () => {
  it('output is uniformly distributed (chi-squared test)', () => {
    const rng = new SeededRandom(42);
    const buckets = 10;
    const counts = new Array(buckets).fill(0);
    const n = 10_000;

    for (let i = 0; i < n; i++) {
      const bucket = Math.floor(rng.next() * buckets);
      counts[bucket]++;
    }

    const expected = n / buckets;
    const chiSquared = counts.reduce((sum, count) => sum + (count - expected) ** 2 / expected, 0);

    // Chi-squared critical value for 9 degrees of freedom, alpha=0.01 is ~21.67
    expect(chiSquared).toBeLessThan(21.67);
  });

  it('different seeds produce uncorrelated sequences', () => {
    const n = 1000;
    const sequences = Array.from({ length: 5 }, (_, i) => {
      const rng = new SeededRandom(i * 1000 + 1);
      return Array.from({ length: n }, () => rng.next());
    });

    // Check pairwise correlation is low
    for (let i = 0; i < sequences.length; i++) {
      for (let j = i + 1; j < sequences.length; j++) {
        const correlation = pearsonCorrelation(sequences[i], sequences[j]);
        expect(Math.abs(correlation)).toBeLessThan(0.1);
      }
    }
  });
});

// Helper: Pearson correlation coefficient
function pearsonCorrelation(x: number[], y: number[]): number {
  const n = x.length;
  const mx = mean(x);
  const my = mean(y);
  let num = 0,
    dx2 = 0,
    dy2 = 0;
  for (let i = 0; i < n; i++) {
    const dx = x[i] - mx;
    const dy = y[i] - my;
    num += dx * dy;
    dx2 += dx * dx;
    dy2 += dy * dy;
  }
  return num / Math.sqrt(dx2 * dy2);
}
