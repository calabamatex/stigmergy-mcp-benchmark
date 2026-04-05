import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { z } from 'zod';
import type { TraceStore } from './store.js';

export function createServer(store: TraceStore): McpServer {
  const server = new McpServer({
    name: 'stigmergy-mcp',
    version: '0.1.0',
  });

  server.tool(
    'deposit_trace',
    'Deposit a trace into the stigmergic environment',
    {
      area: z.string().describe('The area/namespace for the trace'),
      action: z.string().describe('Description of what the agent did'),
      trace_type: z.string().optional().describe('Type of trace (info, warning, result)'),
      intensity: z.number().min(0).max(1).optional().describe('Signal strength 0-1'),
      tags: z.array(z.string()).optional().describe('Tags for categorization'),
      agent_id: z.string().optional().describe('ID of the depositing agent'),
    },
    async (params) => {
      const trace = store.deposit(params);
      return { content: [{ type: 'text' as const, text: JSON.stringify(trace) }] };
    },
  );

  server.tool(
    'sense_environment',
    'Sense traces in an area of the stigmergic environment',
    {
      area: z.string().describe('The area/namespace to sense (prefix match)'),
    },
    async (params) => {
      const traces = store.sense(params.area);
      return { content: [{ type: 'text' as const, text: JSON.stringify(traces) }] };
    },
  );

  server.tool(
    'reinforce_trace',
    'Reinforce or weaken an existing trace',
    {
      trace_id: z.string().describe('ID of the trace to reinforce'),
      delta: z.number().describe('Amount to change intensity (-1 to 1)'),
    },
    async (params) => {
      const trace = store.reinforce(params.trace_id, params.delta);
      if (!trace) {
        return { content: [{ type: 'text' as const, text: JSON.stringify({ error: 'Trace not found' }) }] };
      }
      return { content: [{ type: 'text' as const, text: JSON.stringify(trace) }] };
    },
  );

  server.tool(
    'get_gradient',
    'Get an activity gradient for an area',
    {
      area: z.string().describe('The area/namespace to get gradient for'),
    },
    async (params) => {
      const gradient = store.getGradient(params.area);
      return { content: [{ type: 'text' as const, text: JSON.stringify(gradient) }] };
    },
  );

  return server;
}
