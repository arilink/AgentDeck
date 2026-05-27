import { writable, derived, type Readable } from 'svelte/store';
import { SvelteMap } from 'svelte/reactivity';
import type { AgentInfo } from '$lib/protocol/schema';
import { workdirTail, sessionTitle } from '$lib/util/agent-display';

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

export const agentsList: Readable<AgentRecord[]> = derived(agentsMap, (m) => {
  const items = Array.from(m.values());
  const groups = new Map<string, AgentRecord[]>();
  for (const a of items) {
    const key = workdirTail(a);
    let arr = groups.get(key);
    if (!arr) {
      arr = [];
      groups.set(key, arr);
    }
    arr.push(a);
  }
  const sortedGroups = Array.from(groups.entries()).sort((a, b) => {
    const maxA = a[1].reduce((m, x) => Math.max(m, x.started_at), 0);
    const maxB = b[1].reduce((m, x) => Math.max(m, x.started_at), 0);
    return maxB - maxA || a[0].localeCompare(b[0]);
  });
  const out: AgentRecord[] = [];
  for (const [, arr] of sortedGroups) {
    arr.sort((a, b) => a.started_at - b.started_at || a.id.localeCompare(b.id));
    out.push(...arr);
  }
  return out;
});

export const collidingAgentIds: Readable<Set<string>> = derived(agentsMap, (m) => {
  const buckets = new Map<string, string[]>();
  for (const a of m.values()) {
    const key = `${workdirTail(a)}${sessionTitle(a)}`;
    let arr = buckets.get(key);
    if (!arr) {
      arr = [];
      buckets.set(key, arr);
    }
    arr.push(a.id);
  }
  const result = new Set<string>();
  for (const arr of buckets.values()) {
    if (arr.length > 1) for (const id of arr) result.add(id);
  }
  return result;
});

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
