import { EventEmitter } from 'node:events';
import { makeLogger } from './logger.js';
import type {
  AdapterEvent,
  AgentInfo,
  AgentState,
  PendingDecision,
} from './protocol.js';

const log = makeLogger('state');

const IDLE_TIMEOUT_MS = 60_000;

export type AgentEvent =
  | { kind: 'added'; agent: AgentInfo }
  | { kind: 'updated'; agent: AgentInfo }
  | { kind: 'removed'; agent_id: string }
  | { kind: 'decision_show'; agent_id: string; decision: PendingDecision }
  | { kind: 'decision_hide'; agent_id: string };

interface AgentRecord extends AgentInfo {
  last_active: number;
  idleTimer?: NodeJS.Timeout;
}

export class AgentRegistry extends EventEmitter {
  private agents = new Map<string, AgentRecord>();

  list(): AgentInfo[] {
    return Array.from(this.agents.values()).map(stripInternal);
  }

  ingest(event: AdapterEvent): void {
    const id = agentId(event);
    const existing = this.agents.get(id);
    const now = event.timestamp || Date.now();

    if (!existing) {
      if (event.event_type === 'session_end') return;
      const agent: AgentRecord = {
        id,
        source: event.source,
        state: 'idle',
        label: defaultLabel(event),
        current_tool: null,
        pending_decision: null,
        metadata: { ...(event.payload || {}) },
        last_active: now,
      };
      applyTransition(agent, event);
      this.agents.set(id, agent);
      this.armIdleTimer(agent);
      log.info(`agent added ${id} → ${agent.state}`);
      this.emit('event', { kind: 'added', agent: stripInternal(agent) } satisfies AgentEvent);
      this.fireDecisionMessages(agent);
      return;
    }

    const prevState = existing.state;
    const prevDecision = existing.pending_decision;
    applyTransition(existing, event);
    existing.last_active = now;
    this.armIdleTimer(existing);

    if (event.event_type === 'session_end') {
      this.removeAgent(id);
      return;
    }

    if (existing.state !== prevState
        || existing.pending_decision !== prevDecision
        || event.event_type === 'tool_use_start'
        || event.event_type === 'tool_use_end'
        || event.event_type === 'user_prompt') {
      this.emit('event', { kind: 'updated', agent: stripInternal(existing) } satisfies AgentEvent);
    }

    if (existing.pending_decision && existing.pending_decision !== prevDecision) {
      this.emit('event', {
        kind: 'decision_show',
        agent_id: id,
        decision: existing.pending_decision,
      } satisfies AgentEvent);
    } else if (!existing.pending_decision && prevDecision) {
      this.emit('event', { kind: 'decision_hide', agent_id: id } satisfies AgentEvent);
    }
  }

  resolveDecision(agent_id: string, _choice: string): void {
    const agent = this.agents.get(agent_id);
    if (!agent || !agent.pending_decision) return;
    agent.pending_decision = null;
    agent.state = 'thinking';
    agent.last_active = Date.now();
    this.armIdleTimer(agent);
    this.emit('event', { kind: 'updated', agent: stripInternal(agent) } satisfies AgentEvent);
    this.emit('event', { kind: 'decision_hide', agent_id } satisfies AgentEvent);
  }

  private removeAgent(id: string): void {
    const agent = this.agents.get(id);
    if (!agent) return;
    if (agent.idleTimer) clearTimeout(agent.idleTimer);
    this.agents.delete(id);
    log.info(`agent removed ${id}`);
    this.emit('event', { kind: 'removed', agent_id: id } satisfies AgentEvent);
  }

  private armIdleTimer(agent: AgentRecord): void {
    if (agent.idleTimer) clearTimeout(agent.idleTimer);
    if (agent.state === 'waiting' || agent.state === 'done') return;
    agent.idleTimer = setTimeout(() => {
      if (agent.state === 'tool_use' || agent.state === 'thinking') {
        agent.state = 'idle';
        agent.current_tool = null;
        log.debug(`agent ${agent.id} idle (timeout)`);
        this.emit('event', { kind: 'updated', agent: stripInternal(agent) } satisfies AgentEvent);
      }
    }, IDLE_TIMEOUT_MS);
  }

  private fireDecisionMessages(agent: AgentRecord): void {
    if (agent.pending_decision) {
      this.emit('event', {
        kind: 'decision_show',
        agent_id: agent.id,
        decision: agent.pending_decision,
      } satisfies AgentEvent);
    }
  }
}

function agentId(event: AdapterEvent): string {
  return `${event.source}:${event.session_id}`;
}

function defaultLabel(event: AdapterEvent): string {
  const workdir = (event.payload?.workdir as string | undefined) || '';
  const short = workdir.split(/[/\\]/).filter(Boolean).slice(-1)[0] || event.source;
  return short;
}

function stripInternal(rec: AgentRecord): AgentInfo {
  const { last_active: _l, idleTimer: _t, ...info } = rec;
  return info;
}

function applyTransition(agent: AgentRecord, event: AdapterEvent): void {
  const payload = event.payload || {};
  if (event.event_type !== 'context_compact' && agent.metadata?.compacting) {
    delete agent.metadata.compacting;
  }
  switch (event.event_type) {
    case 'session_start': {
      agent.state = 'idle';
      const workdir = payload.workdir as string | undefined;
      const model = payload.model as string | undefined;
      if (workdir) (agent.metadata ||= {}).workdir = workdir;
      if (model) (agent.metadata ||= {}).model = model;
      break;
    }
    case 'user_prompt': {
      agent.state = 'thinking';
      const preview = payload.prompt_preview as string | undefined;
      if (preview) agent.label = truncateLabel(preview);
      break;
    }
    case 'thinking_start': {
      agent.state = 'thinking';
      break;
    }
    case 'tool_use_start': {
      const tool = payload.tool_name as string | undefined;
      const argsPreview = payload.tool_args_preview as string | undefined;
      agent.state = 'tool_use';
      agent.current_tool = tool || null;
      agent.label = tool ? `Using ${tool}` : 'Using tool';
      agent.metadata ||= {};
      if (tool) agent.metadata.tool_name = tool;
      if (argsPreview !== undefined) agent.metadata.tool_args_preview = argsPreview;
      break;
    }
    case 'tool_use_end': {
      agent.state = 'thinking';
      agent.current_tool = null;
      break;
    }
    case 'decision_required': {
      const message = (payload.message as string | undefined) || 'Decision required';
      const optionsRaw = payload.options as Array<{ key?: string; label?: string }> | undefined;
      const options: PendingDecision['options'] = Array.isArray(optionsRaw) && optionsRaw.length > 0
        ? optionsRaw
            .filter((o) => o && typeof o.key === 'string' && typeof o.label === 'string')
            .map((o) => ({ key: o.key!, label: o.label! }))
        : [
            { key: 'y', label: 'Yes' },
            { key: 'n', label: 'No' },
          ];
      agent.pending_decision = { message, options };
      agent.state = 'waiting';
      agent.label = truncateLabel(message);
      break;
    }
    case 'decision_resolved': {
      agent.pending_decision = null;
      agent.state = 'thinking';
      break;
    }
    case 'response_complete': {
      agent.state = 'done';
      agent.current_tool = null;
      agent.pending_decision = null;
      break;
    }
    case 'context_compact': {
      agent.metadata ||= {};
      agent.metadata.compacting = true;
      agent.label = 'Compacting context';
      break;
    }
    case 'session_end': {
      agent.state = 'done';
      agent.current_tool = null;
      agent.pending_decision = null;
      break;
    }
  }

  if (agent.state !== 'waiting' && agent.pending_decision) {
    agent.pending_decision = null;
  }
}

function truncateLabel(s: string, max = 64): string {
  return s.length > max ? s.slice(0, max - 1) + '…' : s;
}

export type { AgentInfo, AgentState } from './protocol.js';
