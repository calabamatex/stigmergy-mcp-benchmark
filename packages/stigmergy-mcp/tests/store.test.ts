import { describe, it, expect } from 'vitest';
import { TraceStore } from '../src/store.js';

describe('TraceStore', () => {
  it('deposits and senses traces', () => {
    const store = new TraceStore(':memory:');

    const trace = store.deposit({
      area: 'test/area',
      action: 'wrote some code',
      trace_type: 'info',
      intensity: 0.9,
      tags: ['test'],
      agent_id: 'agent-1',
    });

    expect(trace.id).toBeDefined();
    expect(trace.area).toBe('test/area');
    expect(trace.intensity).toBe(0.9);

    const sensed = store.sense('test/');
    expect(sensed).toHaveLength(1);
    expect(sensed[0].action).toBe('wrote some code');

    store.close();
  });

  it('reinforces trace intensity', () => {
    const store = new TraceStore(':memory:');

    const trace = store.deposit({
      area: 'test/',
      action: 'initial',
      intensity: 0.5,
    });

    const reinforced = store.reinforce(trace.id, 0.3);
    expect(reinforced?.intensity).toBe(0.8);

    const weakened = store.reinforce(trace.id, -0.9);
    expect(weakened?.intensity).toBe(0);

    store.close();
  });

  it('returns null for nonexistent trace reinforcement', () => {
    const store = new TraceStore(':memory:');
    const result = store.reinforce('nonexistent', 0.1);
    expect(result).toBeNull();
    store.close();
  });

  it('computes gradient for an area', () => {
    const store = new TraceStore(':memory:');

    store.deposit({ area: 'proj/', action: 'task A', intensity: 0.8 });
    store.deposit({ area: 'proj/', action: 'task B', intensity: 0.6 });

    const gradient = store.getGradient('proj/');
    expect(gradient.traceCount).toBe(2);
    expect(gradient.avgIntensity).toBeCloseTo(0.7);
    expect(gradient.recentActions).toHaveLength(2);

    store.close();
  });

  it('isolates data between stores', () => {
    const store1 = new TraceStore(':memory:');
    const store2 = new TraceStore(':memory:');

    store1.deposit({ area: 'test/', action: 'from store 1' });
    const sensed = store2.sense('test/');
    expect(sensed).toHaveLength(0);

    store1.close();
    store2.close();
  });
});
