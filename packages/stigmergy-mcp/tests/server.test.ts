import { describe, it, expect } from 'vitest';
import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { InMemoryTransport } from '@modelcontextprotocol/sdk/inMemory.js';
import { TraceStore } from '../src/store.js';
import { createServer } from '../src/server.js';

describe('MCP Server', () => {
  it('lists 4 tools', async () => {
    const store = new TraceStore(':memory:');
    const server = createServer(store);
    const client = new Client({ name: 'test', version: '1.0.0' });

    const [clientTransport, serverTransport] = InMemoryTransport.createLinkedPair();
    await server.connect(serverTransport);
    await client.connect(clientTransport);

    const { tools } = await client.listTools();
    expect(tools.map(t => t.name).sort()).toEqual([
      'deposit_trace', 'get_gradient', 'reinforce_trace', 'sense_environment',
    ]);

    await client.close();
    await server.close();
    store.close();
  });

  it('deposit and sense via MCP protocol', async () => {
    const store = new TraceStore(':memory:');
    const server = createServer(store);
    const client = new Client({ name: 'test', version: '1.0.0' });

    const [clientTransport, serverTransport] = InMemoryTransport.createLinkedPair();
    await server.connect(serverTransport);
    await client.connect(clientTransport);

    // Deposit
    const depositResult = await client.callTool({
      name: 'deposit_trace',
      arguments: { area: 'test/', action: 'did work', trace_type: 'info', intensity: 0.8, tags: ['a'], agent_id: 'ag1' },
    });
    const deposited = JSON.parse((depositResult.content as Array<{ text: string }>)[0].text);
    expect(deposited.id).toBeDefined();
    expect(deposited.area).toBe('test/');

    // Sense
    const senseResult = await client.callTool({
      name: 'sense_environment',
      arguments: { area: 'test/' },
    });
    const sensed = JSON.parse((senseResult.content as Array<{ text: string }>)[0].text);
    expect(sensed).toHaveLength(1);
    expect(sensed[0].action).toBe('did work');

    // Get gradient
    const gradResult = await client.callTool({
      name: 'get_gradient',
      arguments: { area: 'test/' },
    });
    const gradient = JSON.parse((gradResult.content as Array<{ text: string }>)[0].text);
    expect(gradient.traceCount).toBe(1);
    expect(gradient.avgIntensity).toBeCloseTo(0.8);

    // Reinforce
    const reinforceResult = await client.callTool({
      name: 'reinforce_trace',
      arguments: { trace_id: deposited.id, delta: 0.1 },
    });
    const reinforced = JSON.parse((reinforceResult.content as Array<{ text: string }>)[0].text);
    expect(reinforced.intensity).toBeCloseTo(0.9);

    await client.close();
    await server.close();
    store.close();
  });
});
