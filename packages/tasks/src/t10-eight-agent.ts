import { buildNAgentPipeline } from './n-agent-pipeline.js';
import { registerTask } from './registry.js';

const task = buildNAgentPipeline(8);
registerTask(task);
export default task;
