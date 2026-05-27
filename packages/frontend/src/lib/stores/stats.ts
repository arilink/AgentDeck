import { derived } from 'svelte/store';
import type { AgentState } from '$lib/protocol/schema';
import { agentsList } from './agents';

export interface AgentStats {
  running: number;
  waiting: number;
  done: number;
  idle: number;
  total: number;
  active: number;
  byState: Record<AgentState, number>;
}

export const agentStats = derived(agentsList, (list): AgentStats => {
  const byState: Record<AgentState, number> = {
    idle: 0,
    thinking: 0,
    tool_use: 0,
    waiting: 0,
    done: 0,
  };
  for (const a of list) byState[a.state] += 1;

  const running = byState.thinking + byState.tool_use;
  const active = running + byState.waiting;
  return {
    running,
    waiting: byState.waiting,
    done: byState.done,
    idle: byState.idle,
    total: list.length,
    active,
    byState,
  };
});

export const pendingQueue = derived(agentsList, (list) =>
  list.filter((a) => a.state === 'waiting' && a.pending_decision),
);
