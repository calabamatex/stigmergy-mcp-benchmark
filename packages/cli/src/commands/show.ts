import { BenchmarkStore } from '@stigmergy-benchmark/storage';
import { formatComparisonResult } from '../format/results.js';

export function showResultCommand(id: string, dbPath: string): void {
  const store = new BenchmarkStore(dbPath);

  try {
    const result = store.getComparisonResult(id);
    if (!result) {
      // Try prefix match
      const all = store.listComparisons();
      const match = all.find(c => c.id.startsWith(id));
      if (match) {
        const fullResult = store.getComparisonResult(match.id);
        if (fullResult) {
          console.log(formatComparisonResult(fullResult));
          return;
        }
      }
      console.error(`Comparison not found: ${id}`);
      process.exit(1);
    }

    console.log(formatComparisonResult(result));
  } finally {
    store.close();
  }
}
