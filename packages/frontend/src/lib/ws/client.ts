import {
  FrontendOutboundSchema,
  PROTOCOL_VERSION,
  type FrontendInbound,
} from '$lib/protocol/schema';
import { connectionStatus } from '$lib/stores/connection';
import {
  replaceAll,
  upsertAgent,
  removeAgent,
  clearAgents,
} from '$lib/stores/agents';
import { showDecision, hideDecision } from '$lib/stores/decision';
import { backoffDelay } from '$lib/util/backoff';

const DEFAULT_URL = 'ws://127.0.0.1:7892';

let ws: WebSocket | null = null;
let url = DEFAULT_URL;
let attempts = 0;
let manualClose = false;
let reconnectTimer: ReturnType<typeof setTimeout> | null = null;
let versionMismatch = false;

export function connect(target: string = DEFAULT_URL): void {
  url = target;
  manualClose = false;
  versionMismatch = false;
  open();
}

export function disconnect(): void {
  manualClose = true;
  if (reconnectTimer) {
    clearTimeout(reconnectTimer);
    reconnectTimer = null;
  }
  if (ws) {
    try {
      ws.close();
    } catch {
      // ignore
    }
    ws = null;
  }
  connectionStatus.set('disconnected');
}

export function send(msg: FrontendInbound): void {
  if (!ws || ws.readyState !== WebSocket.OPEN) {
    console.warn('[ws] send dropped, socket not open', msg);
    return;
  }
  ws.send(JSON.stringify(msg));
}

function open(): void {
  if (versionMismatch) return;
  connectionStatus.set(attempts === 0 ? 'connecting' : 'connecting');
  try {
    ws = new WebSocket(url);
  } catch (err) {
    console.warn('[ws] failed to construct WebSocket', err);
    scheduleReconnect();
    return;
  }

  ws.onopen = () => {
    attempts = 0;
    send({ type: 'hello', protocol_version: PROTOCOL_VERSION });
  };

  ws.onmessage = (ev) => {
    let parsed: unknown;
    try {
      parsed = JSON.parse(typeof ev.data === 'string' ? ev.data : '');
    } catch {
      console.warn('[ws] non-JSON frame, dropping');
      return;
    }
    const result = FrontendOutboundSchema.safeParse(parsed);
    if (!result.success) {
      console.warn('[ws] schema rejected', result.error.issues);
      return;
    }
    handleMessage(result.data);
  };

  ws.onclose = () => {
    ws = null;
    if (manualClose || versionMismatch) return;
    connectionStatus.set('disconnected');
    scheduleReconnect();
  };

  ws.onerror = (ev) => {
    console.warn('[ws] socket error', ev);
  };
}

function scheduleReconnect(): void {
  if (manualClose || versionMismatch) return;
  if (reconnectTimer) return;
  const delay = backoffDelay(attempts);
  attempts += 1;
  reconnectTimer = setTimeout(() => {
    reconnectTimer = null;
    open();
  }, delay);
}

function handleMessage(msg: import('$lib/protocol/schema').FrontendOutbound): void {
  switch (msg.type) {
    case 'hello_ack':
      if (!msg.supported) {
        versionMismatch = true;
        connectionStatus.set('version_mismatch');
        console.error(
          `[ws] protocol version mismatch: server=${msg.protocol_version} client=${PROTOCOL_VERSION}`,
        );
        if (ws) ws.close();
        return;
      }
      connectionStatus.set('connected');
      break;
    case 'agent_list':
      replaceAll(msg.agents);
      break;
    case 'agent_update':
      upsertAgent({
        id: msg.agent_id,
        source: extractSource(msg.agent_id),
        state: msg.state,
        label: msg.label,
        current_tool: msg.current_tool ?? null,
        pending_decision: msg.pending_decision ?? null,
        metadata: msg.metadata,
      });
      break;
    case 'agent_remove':
      removeAgent(msg.agent_id);
      break;
    case 'decision_show':
      showDecision(msg.agent_id, msg.decision);
      break;
    case 'decision_hide':
      hideDecision(msg.agent_id);
      break;
  }
}

function extractSource(agent_id: string): string {
  const idx = agent_id.indexOf(':');
  return idx > 0 ? agent_id.slice(0, idx) : 'unknown';
}

export function resetForMock(): void {
  manualClose = true;
  if (reconnectTimer) {
    clearTimeout(reconnectTimer);
    reconnectTimer = null;
  }
  if (ws) {
    try {
      ws.close();
    } catch {
      // ignore
    }
    ws = null;
  }
  clearAgents();
}
