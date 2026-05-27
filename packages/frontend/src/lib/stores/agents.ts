import { writable, derived, type Readable } from 'svelte/store';
import { SvelteMap } from 'svelte/reactivity';
import type { AgentInfo } from '$lib/protocol/schema';

export interface AgentRecord extends AgentInfo {
  started_at: number;
}

const map = new SvelteMap<string, AgentRecord>();
const version = writable(0);

function bump(): void {
  version.update((n) => n + 1);
}

export const agentsMap: Readable<SvelteMap<string, AgentRecord>> = {
  subscribe(run) {
    return version.subscribe(() => run(map));
  },
};

export const agentsList: Readable<AgentRecord[]> = derived(agentsMap, (m) =>
  Array.from(m.values()).sort((a, b) => a.id.localeCompare(b.id)),
);

export function replaceAll(agents: AgentInfo[]): void {
  map.clear();
  const now = Date.now();
  for (const a of agents) {
    map.set(a.id, { ...a, started_at: now });
  }
  bump();
}

export function upsertAgent(agent: AgentInfo): void {
  const existing = map.get(agent.id);
  const started_at = existing?.started_at ?? Date.now();
  map.set(agent.id, { ...agent, started_at });
  bump();
}

export function patchAgent(
  agent_id: string,
  patch: Partial<AgentInfo> & { state: AgentInfo['state'] },
): void {
  const existing = map.get(agent_id);
  const now = Date.now();
  const next: AgentRecord = existing
    ? {
        ...existing,
        ...patch,
        started_at:
          existing.state !== patch.state ? now : existing.started_at,
      }
    : {
        id: agent_id,
        source: 'unknown',
        ...patch,
        started_at: now,
      };
  map.set(agent_id, next);
  bump();
}

export function removeAgent(agent_id: string): void {
  if (map.delete(agent_id)) bump();
}

export function clearAgents(): void {
  if (map.size === 0) return;
  map.clear();
  bump();
}
