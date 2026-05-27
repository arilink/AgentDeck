import { WebSocketServer, WebSocket } from 'ws';
import { makeLogger } from './logger.js';
import {
  FrontendInboundSchema,
  PROTOCOL_VERSION,
  type FrontendOutbound,
} from './protocol.js';
import type { AgentEvent, AgentRegistry } from './state.js';

const log = makeLogger('ws-frontend');

export function startFrontendWsServer(opts: {
  host: string;
  port: number;
  registry: AgentRegistry;
}): WebSocketServer {
  const wss = new WebSocketServer({ host: opts.host, port: opts.port });
  const clients = new Set<WebSocket>();

  function send(ws: WebSocket, msg: FrontendOutbound): void {
    if (ws.readyState !== WebSocket.OPEN) return;
    ws.send(JSON.stringify(msg));
  }

  function broadcast(msg: FrontendOutbound): void {
    const payload = JSON.stringify(msg);
    for (const ws of clients) {
      if (ws.readyState === WebSocket.OPEN) ws.send(payload);
    }
  }

  const onAgentEvent = (event: AgentEvent): void => {
    switch (event.kind) {
      case 'added':
      case 'updated':
        broadcast({
          type: 'agent_update',
          agent_id: event.agent.id,
          state: event.agent.state,
          label: event.agent.label,
          current_tool: event.agent.current_tool ?? null,
          pending_decision: event.agent.pending_decision ?? null,
          metadata: event.agent.metadata,
        });
        break;
      case 'removed':
        broadcast({ type: 'agent_remove', agent_id: event.agent_id });
        break;
      case 'decision_show':
        broadcast({
          type: 'decision_show',
          agent_id: event.agent_id,
          decision: event.decision,
        });
        break;
      case 'decision_hide':
        broadcast({ type: 'decision_hide', agent_id: event.agent_id });
        break;
    }
  };
  opts.registry.on('event', onAgentEvent);

  wss.on('connection', (ws, req) => {
    clients.add(ws);
    log.info(`client connected (${clients.size} total) from ${req.socket.remoteAddress}`);

    ws.on('message', (raw) => {
      let json: unknown;
      try {
        json = JSON.parse(raw.toString());
      } catch {
        log.warn('non-JSON frame, dropping');
        return;
      }
      const parsed = FrontendInboundSchema.safeParse(json);
      if (!parsed.success) {
        log.warn('inbound schema rejected', parsed.error.flatten());
        return;
      }
      const msg = parsed.data;
      switch (msg.type) {
        case 'hello':
          send(ws, {
            type: 'hello_ack',
            protocol_version: PROTOCOL_VERSION,
            supported: msg.protocol_version === PROTOCOL_VERSION,
          });
          send(ws, { type: 'agent_list', agents: opts.registry.list() });
          break;
        case 'decision_response':
          log.info(`decision response: ${msg.agent_id} → ${msg.choice}`);
          opts.registry.resolveDecision(msg.agent_id, msg.choice);
          break;
        case 'agent_pin':
        case 'agent_unpin':
          log.debug(`pin op: ${msg.type} ${msg.agent_id}`);
          break;
      }
    });

    ws.on('close', () => {
      clients.delete(ws);
      log.info(`client disconnected (${clients.size} total)`);
    });

    ws.on('error', (err) => log.warn('socket error', err.message));
  });

  wss.on('listening', () =>
    log.info(`websocket listening on ws://${opts.host}:${opts.port}`),
  );

  return wss;
}
