import { makeLogger } from './logger.js';
import { startHttpServer } from './http-server.js';
import { startFrontendWsServer } from './ws-frontend.js';
import { startDeviceWsServer } from './ws-device.js';
import { AgentRegistry } from './state.js';

const log = makeLogger('boot');

const HOST = process.env.AGENTDECK_HOST || '127.0.0.1';
const HTTP_PORT = parseInt(process.env.AGENTDECK_PORT || '7891', 10);
const FRONTEND_WS_PORT = parseInt(process.env.AGENTDECK_FRONTEND_PORT || '7892', 10);
const DEVICE_WS_PORT = parseInt(process.env.AGENTDECK_DEVICE_PORT || '7894', 10);

export interface BackendHandle {
  registry: AgentRegistry;
  close: () => Promise<void>;
}

export async function startBackend(): Promise<BackendHandle> {
  const registry = new AgentRegistry();
  const http = await startHttpServer({ host: HOST, port: HTTP_PORT, registry });
  const frontendWs = startFrontendWsServer({ host: HOST, port: FRONTEND_WS_PORT, registry });
  const deviceWs = startDeviceWsServer({ host: HOST, port: DEVICE_WS_PORT });
  log.info('AgentDeck backend ready');
  return {
    registry,
    close: async () => {
      try {
        await http.close();
        frontendWs.close();
        deviceWs.close();
      } catch (err) {
        log.error('shutdown error', err);
      }
    },
  };
}

async function main(): Promise<void> {
  const handle = await startBackend();

  const shutdown = async (signal: string): Promise<void> => {
    log.info(`shutting down (${signal})`);
    await handle.close();
    process.exit(0);
  };

  process.on('SIGINT', () => void shutdown('SIGINT'));
  process.on('SIGTERM', () => void shutdown('SIGTERM'));
}

const isMain =
  typeof process !== 'undefined' &&
  process.argv[1] &&
  import.meta.url === `file://${process.argv[1].replace(/\\/g, '/')}`;

if (isMain) {
  main().catch((err) => {
    log.error('fatal startup error', err);
    process.exit(1);
  });
}
