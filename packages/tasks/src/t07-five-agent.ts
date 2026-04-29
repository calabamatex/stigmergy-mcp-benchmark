import { buildNAgentPipeline } from './n-agent-pipeline.js';
import { registerTask } from './registry.js';

const task = buildNAgentPipeline(5);
registerTask(task);
export default task;
