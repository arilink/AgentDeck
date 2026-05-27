import Fastify, { type FastifyInstance } from 'fastify';
import { makeLogger } from './logger.js';
import { AdapterEventSchema } from './protocol.js';
import type { AgentRegistry } from './state.js';

const log = makeLogger('http');

export async function startHttpServer(opts: {
  host: string;
  port: number;
  registry: AgentRegistry;
}): Promise<FastifyInstance> {
  const app = Fastify({ logger: false, bodyLimit: 256 * 1024 });

  app.get('/health', async () => ({
    ok: true,
    agents: opts.registry.list().length,
  }));

  app.post('/event', async (req, reply) => {
    const parsed = AdapterEventSchema.safeParse(req.body);
    if (!parsed.success) {
      log.warn('rejected event', parsed.error.flatten());
      reply.code(400);
      return { received: false, error: 'schema_validation_failed' };
    }
    log.info(`event ${parsed.data.source}:${parsed.data.session_id} ${parsed.data.event_type}`);
    opts.registry.ingest(parsed.data);
    return { received: true };
  });

  app.get('/agents', async () => ({ agents: opts.registry.list() }));

  await app.listen({ host: opts.host, port: opts.port });
  log.info(`http listening on http://${opts.host}:${opts.port}`);
  return app;
}
