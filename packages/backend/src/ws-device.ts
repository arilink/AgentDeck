import { WebSocketServer, WebSocket } from 'ws';
import { makeLogger } from './logger.js';
import { DeviceInboundSchema, PROTOCOL_VERSION } from './protocol.js';

const log = makeLogger('ws-device');

export function startDeviceWsServer(opts: {
  host: string;
  port: number;
}): WebSocketServer {
  const wss = new WebSocketServer({ host: opts.host, port: opts.port, path: '/device' });

  wss.on('connection', (ws, req) => {
    log.info(`bridge connected from ${req.socket.remoteAddress}`);

    ws.on('message', (raw) => {
      let json: unknown;
      try {
        json = JSON.parse(raw.toString());
      } catch {
        log.warn('non-JSON frame, dropping');
        return;
      }
      const parsed = DeviceInboundSchema.safeParse(json);
      if (!parsed.success) {
        log.warn('inbound schema rejected', parsed.error.flatten());
        return;
      }
      const msg = parsed.data;
      if ('event_type' in msg) {
        log.info(`device event: ${msg.event_type} from ${msg.device_id} (placeholder — not routed yet)`);
        return;
      }
      ws.send(JSON.stringify({
        type: 'hello_ack',
        protocol_version: PROTOCOL_VERSION,
        supported: msg.protocol_version === PROTOCOL_VERSION,
      }));
    });

    ws.on('close', () => log.info('bridge disconnected'));
    ws.on('error', (err) => log.warn('bridge socket error', err.message));
  });

  wss.on('listening', () =>
    log.info(`device websocket listening on ws://${opts.host}:${opts.port}/device (v1 placeholder)`),
  );

  return wss;
}
