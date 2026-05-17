import { buildNAgentPipeline } from './n-agent-pipeline.js';
import { registerTask } from './registry.js';

const task = buildNAgentPipeline(7);
registerTask(task);
export default task;
