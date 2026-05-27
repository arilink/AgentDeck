import type { AgentState } from '$lib/protocol/schema';
import { replaceAll, patchAgent } from '$lib/stores/agents';
import { connectionStatus } from '$lib/stores/connection';
import { seedAgents, seedToAgentInfo } from './seed';

const STATES: AgentState[] = ['idle', 'thinking', 'tool_use', 'waiting', 'done'];

const LABELS: Record<AgentState, string[]> = {
  idle: ['Awaiting next task', 'Sleeping', 'Standby'],
  thinking: ['Designing tree…', 'Planning steps…', 'Reasoning about deps'],
  tool_use: ['Reading auth.ts', 'Running pytest -x', 'Editing config.json', 'Bash: git status'],
  waiting: ['Confirm: apply?', 'Allow Bash command?', 'Approve commit?'],
  done: ['42 tests passed', 'Build green', 'Migration applied'],
};

const TOOLS: Record<AgentState, string | null> = {
  idle: null,
  thinking: null,
  tool_use: 'Read',
  waiting: null,
  done: null,
};

let timer: ReturnType<typeof setInterval> | null = null;

export function startMock(): void {
  connectionStatus.set('mock');
  replaceAll(seedAgents.map(seedToAgentInfo));

  if (timer) clearInterval(timer);
  timer = setInterval(() => {
    const target = seedAgents[Math.floor(Math.random() * seedAgents.length)];
    if (!target) return;
    const nextState = STATES[Math.floor(Math.random() * STATES.length)] ?? 'idle';
    const labels = LABELS[nextState];
    const label = labels[Math.floor(Math.random() * labels.length)] ?? '';
    patchAgent(target.id, {
      state: nextState,
      label,
      current_tool: TOOLS[nextState],
      pending_decision:
        nextState === 'waiting'
          ? {
              message: 'Allow this command to run?',
              options: [
                { key: 'y', label: 'Yes, run it' },
                { key: 'n', label: 'No, deny' },
              ],
            }
          : null,
    });
  }, 2500);
}

export function stopMock(): void {
  if (timer) {
    clearInterval(timer);
    timer = null;
  }
}
