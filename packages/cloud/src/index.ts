import Fastify from 'fastify';
import fastifyWebsocket from '@fastify/websocket';
import postgres from 'postgres';

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

async function autoMigrate() {
  const sql = postgres(DATABASE_URL);
  try {
    await sql`
      CREATE TABLE IF NOT EXISTS agents (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        handle VARCHAR(64) UNIQUE NOT NULL,
        display_name VARCHAR(128),
        api_key_hash VARCHAR(128) NOT NULL,
        status VARCHAR(16) DEFAULT 'offline',
        last_seen TIMESTAMP,
        created_at TIMESTAMP DEFAULT now()
      )
    `;
    await sql`
      CREATE TABLE IF NOT EXISTS contacts (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        owner_id UUID NOT NULL REFERENCES agents(id),
        contact_id UUID NOT NULL REFERENCES agents(id),
        tier VARCHAR(16) DEFAULT 'stranger',
        alias VARCHAR(64),
        blocked BOOLEAN DEFAULT false,
        created_at TIMESTAMP DEFAULT now()
      )
    `;
    await sql`CREATE UNIQUE INDEX IF NOT EXISTS contacts_owner_contact_idx ON contacts(owner_id, contact_id)`;
    await sql`CREATE INDEX IF NOT EXISTS contacts_owner_idx ON contacts(owner_id)`;
    await sql`
      CREATE TABLE IF NOT EXISTS messages (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        from_id UUID NOT NULL REFERENCES agents(id),
        to_id UUID NOT NULL REFERENCES agents(id),
        content TEXT NOT NULL,
        metadata JSONB DEFAULT '{}',
        delivered BOOLEAN DEFAULT false,
        created_at TIMESTAMP DEFAULT now()
      )
    `;
    await sql`CREATE INDEX IF NOT EXISTS messages_to_delivered_idx ON messages(to_id, delivered)`;
    await sql`CREATE INDEX IF NOT EXISTS messages_from_created_idx ON messages(from_id, created_at)`;
    await sql`CREATE INDEX IF NOT EXISTS messages_conversation_idx ON messages(to_id, from_id, created_at)`;
    await sql`
      CREATE TABLE IF NOT EXISTS groups (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        name VARCHAR(128) NOT NULL,
        created_by UUID NOT NULL REFERENCES agents(id),
        created_at TIMESTAMP DEFAULT now()
      )
    `;
    await sql`
      CREATE TABLE IF NOT EXISTS group_members (
        group_id UUID NOT NULL REFERENCES groups(id),
        agent_id UUID NOT NULL REFERENCES agents(id),
        joined_at TIMESTAMP DEFAULT now(),
        PRIMARY KEY (group_id, agent_id)
      )
    `;
    await sql`
      CREATE TABLE IF NOT EXISTS group_messages (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        group_id UUID NOT NULL REFERENCES groups(id),
        from_id UUID NOT NULL REFERENCES agents(id),
        content TEXT NOT NULL,
        metadata JSONB DEFAULT '{}',
        created_at TIMESTAMP DEFAULT now()
      )
    `;
    await sql`CREATE INDEX IF NOT EXISTS group_messages_group_created_idx ON group_messages(group_id, created_at)`;
    await sql`CREATE INDEX IF NOT EXISTS agents_status_idx ON agents(status)`;
    console.log('Database schema initialized');
  } finally {
    await sql.end();
  }
}

async function main() {
  // Auto-create tables on startup
  await autoMigrate();
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
