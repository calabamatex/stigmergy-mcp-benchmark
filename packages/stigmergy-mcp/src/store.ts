import Database from 'better-sqlite3';

export interface Trace {
  id: string;
  area: string;
  action: string;
  trace_type: string;
  intensity: number;
  tags: string[];
  agent_id: string;
  created_at: number;
}

export class TraceStore {
  private db: Database.Database;

  constructor(dbPath: string) {
    this.db = new Database(dbPath);
    this.db.pragma('journal_mode = WAL');
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS traces (
        id TEXT PRIMARY KEY,
        area TEXT NOT NULL,
        action TEXT NOT NULL,
        trace_type TEXT NOT NULL DEFAULT 'info',
        intensity REAL NOT NULL DEFAULT 1.0,
        tags TEXT NOT NULL DEFAULT '[]',
        agent_id TEXT NOT NULL DEFAULT '',
        created_at INTEGER NOT NULL DEFAULT (unixepoch('now', 'subsec') * 1000)
      )
    `);
  }

  deposit(params: {
    area: string;
    action: string;
    trace_type?: string;
    intensity?: number;
    tags?: string[];
    agent_id?: string;
  }): Trace {
    const id = crypto.randomUUID();
    const now = Date.now();
    const trace: Trace = {
      id,
      area: params.area,
      action: params.action,
      trace_type: params.trace_type ?? 'info',
      intensity: params.intensity ?? 1.0,
      tags: params.tags ?? [],
      agent_id: params.agent_id ?? '',
      created_at: now,
    };

    this.db.prepare(`
      INSERT INTO traces (id, area, action, trace_type, intensity, tags, agent_id, created_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      trace.id, trace.area, trace.action, trace.trace_type,
      trace.intensity, JSON.stringify(trace.tags), trace.agent_id, trace.created_at,
    );

    return trace;
  }

  sense(area: string): Trace[] {
    const rows = this.db.prepare(
      `SELECT * FROM traces WHERE area LIKE ? ORDER BY created_at DESC`,
    ).all(`${area}%`) as Array<Record<string, unknown>>;

    return rows.map(row => ({
      id: row.id as string,
      area: row.area as string,
      action: row.action as string,
      trace_type: row.trace_type as string,
      intensity: row.intensity as number,
      tags: JSON.parse(row.tags as string) as string[],
      agent_id: row.agent_id as string,
      created_at: row.created_at as number,
    }));
  }

  reinforce(id: string, delta: number): Trace | null {
    const row = this.db.prepare(`SELECT * FROM traces WHERE id = ?`).get(id) as Record<string, unknown> | undefined;
    if (!row) return null;

    const newIntensity = Math.max(0, Math.min(1, (row.intensity as number) + delta));
    this.db.prepare(`UPDATE traces SET intensity = ? WHERE id = ?`).run(newIntensity, id);

    return {
      id: row.id as string,
      area: row.area as string,
      action: row.action as string,
      trace_type: row.trace_type as string,
      intensity: newIntensity,
      tags: JSON.parse(row.tags as string) as string[],
      agent_id: row.agent_id as string,
      created_at: row.created_at as number,
    };
  }

  getGradient(area: string): { area: string; traceCount: number; avgIntensity: number; recentActions: string[] } {
    const traces = this.sense(area);
    if (traces.length === 0) {
      return { area, traceCount: 0, avgIntensity: 0, recentActions: [] };
    }

    const avgIntensity = traces.reduce((sum, t) => sum + t.intensity, 0) / traces.length;
    const recentActions = traces.slice(0, 5).map(t => t.action);

    return { area, traceCount: traces.length, avgIntensity, recentActions };
  }

  close(): void {
    this.db.close();
  }
}
