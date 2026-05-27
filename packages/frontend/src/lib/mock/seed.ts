import type { AgentInfo, AgentState } from '$lib/protocol/schema';

export interface SeedAgent {
  id: string;
  source: string;
  state: AgentState;
  label: string;
  current_tool: string | null;
  metadata: Record<string, unknown>;
}

export const seedAgents: SeedAgent[] = [
  {
    id: 'claude-code:backend-api',
    source: 'claude-code',
    state: 'tool_use',
    label: 'Reading auth.ts',
    current_tool: 'Read',
    metadata: { workdir: '/repo/backend-api', model: 'claude-sonnet-4.7' },
  },
  {
    id: 'claude-code:frontend-ui',
    source: 'claude-code',
    state: 'thinking',
    label: 'Designing tree…',
    current_tool: null,
    metadata: { workdir: '/repo/frontend-ui', model: 'claude-sonnet-4.7' },
  },
  {
    id: 'claude-code:db-migration',
    source: 'claude-code',
    state: 'tool_use',
    label: 'Running pytest -x',
    current_tool: 'Bash',
    metadata: { workdir: '/repo/db-migration', model: 'claude-sonnet-4.7' },
  },
  {
    id: 'claude-code:deploy-pipeline',
    source: 'claude-code',
    state: 'waiting',
    label: 'Confirm: apply?',
    current_tool: null,
    metadata: { workdir: '/repo/deploy-pipeline', model: 'claude-sonnet-4.7' },
  },
  {
    id: 'claude-code:docs-writer',
    source: 'claude-code',
    state: 'idle',
    label: 'Awaiting next task',
    current_tool: null,
    metadata: { workdir: '/repo/docs-writer', model: 'claude-sonnet-4.7' },
  },
  {
    id: 'claude-code:test-runner',
    source: 'claude-code',
    state: 'done',
    label: '42 tests passed',
    current_tool: null,
    metadata: { workdir: '/repo/test-runner', model: 'claude-sonnet-4.7' },
  },
];

export function seedToAgentInfo(s: SeedAgent): AgentInfo {
  return {
    id: s.id,
    source: s.source,
    state: s.state,
    label: s.label,
    current_tool: s.current_tool,
    pending_decision:
      s.state === 'waiting'
        ? {
            message: 'Allow this command to run?',
            options: [
              { key: 'y', label: 'Yes, run it' },
              { key: 'n', label: 'No, deny' },
            ],
          }
        : null,
    metadata: s.metadata,
  };
}
