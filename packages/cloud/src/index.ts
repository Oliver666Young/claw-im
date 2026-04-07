import Fastify from 'fastify';
import fastifyWebsocket from '@fastify/websocket';

import { createDb } from './db/drizzle.js';
import { registerWsHandler } from './ws/handler.js';
import { agentsPlugin } from './api/agents.js';
import { contactsPlugin } from './api/contacts.js';
import { messagesPlugin } from './api/messages.js';

// ─── Env validation ───────────────────────────────────────
if (!process.env.DATABASE_URL) {
  console.error('FATAL: DATABASE_URL environment variable is required');
  process.exit(1);
}

const DATABASE_URL = process.env.DATABASE_URL;
const PORT = parseInt(process.env.PORT ?? '3820', 10);

const startedAt = Date.now();
const db = createDb(DATABASE_URL);

async function main() {
  const app = Fastify({ logger: true });

  // Health check
  app.get('/health', async () => ({
    status: 'ok',
    uptime: Math.floor((Date.now() - startedAt) / 1000),
  }));

  // Register WebSocket support
  await app.register(fastifyWebsocket);

  // Register WebSocket handler
  registerWsHandler(app, db);

  // Register REST API plugins (routes define full paths internally)
  await app.register(agentsPlugin, { db });
  await app.register(contactsPlugin, { db });
  await app.register(messagesPlugin, { db });

  // Start server
  try {
    await app.listen({ port: PORT, host: '0.0.0.0' });
    app.log.info({ port: PORT }, 'Claw IM Cloud server started');
  } catch (err) {
    app.log.error(err);
    process.exit(1);
  }
}

main();
