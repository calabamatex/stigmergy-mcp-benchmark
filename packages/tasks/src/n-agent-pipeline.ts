import { type BenchmarkTask, TaskCategory, TaskDifficulty } from '@stigmergy-benchmark/core';

const WORDS = ['', 'one', 'two', 'three', 'four', 'five', 'six', 'seven', 'eight', 'nine', 'ten'];

const TOPICS = [
  'Project setup',
  'Routing',
  'Middleware',
  'Database',
  'Authentication',
  'Validation',
  'Error handling',
  'Testing',
  'Deployment',
  'Monitoring',
];

function capitalize(s: string): string {
  return s.charAt(0).toUpperCase() + s.slice(1);
}

function joinOxford(items: string[]): string {
  if (items.length === 0) return '';
  if (items.length === 1) return items[0];
  if (items.length === 2) return `${items[0]} and ${items[1]}`;
  return `${items.slice(0, -1).join(', ')}, and ${items[items.length - 1]}`;
}

export function buildNAgentPipeline(n: number): BenchmarkTask {
  if (n < 1 || n > 10) {
    throw new Error(`buildNAgentPipeline supports n in [1, 10], got ${n}`);
  }

  const word = WORDS[n];
  const capitalizedTopics = TOPICS.slice(0, n);
  const lowercasedTopics = capitalizedTopics.map((t) => t.toLowerCase());

  const numbered = capitalizedTopics.map((t, i) => `${i + 1}) ${t}`).join(', ');

  return {
    id: `${word}-agent-pipeline`,
    name: `${capitalize(word)}-Agent Pipeline`,
    description: `A long sequential pipeline with ${n} agents, each contributing a section. Tests O(N²) vs O(N) content transfer scaling.`,
    category: TaskCategory.SEQUENTIAL,
    difficulty: TaskDifficulty.COMPLEX,
    agentCount: n,
    steps: Array.from({ length: n }, (_, i) => ({
      id: `section-${i + 1}`,
      agentRole: `section-${i + 1}-writer`,
      description: `Write section ${i + 1} of the document, building on previous sections.`,
      dependsOn: i > 0 ? [`section-${i}`] : [],
      expectedOutputTokenRange: [100, 400] as [number, number],
    })),
    expectedCoordinationPoints: n - 1,
    userPrompt: `Write a ${n}-section guide to building a production-ready REST API. Each section should cover one topic: ${numbered}.`,
    singleAgentPrompt: `You are an expert backend developer. Write a comprehensive ${n}-section guide to building a production-ready REST API covering: ${joinOxford(lowercasedTopics)}.`,
    crossoverTask: false,
    equivalenceMargin: 5,
  };
}
