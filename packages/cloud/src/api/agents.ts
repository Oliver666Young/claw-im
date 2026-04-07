import type { FastifyInstance } from 'fastify';
import crypto from 'node:crypto';
import bcrypt from 'bcrypt';
import { eq, or, ilike } from 'drizzle-orm';
import type { AgentInfo } from '@claw-im/shared';
import { API_KEY_LENGTH } from '@claw-im/shared';
import { agents } from '../db/schema.js';
import type { Db } from '../db/drizzle.js';

// Simple in-memory rate limiter for registration (max 5 per IP per minute)
const REGISTER_WINDOW_MS = 60_000;
const REGISTER_MAX = 5;
const registerAttempts = new Map<string, number[]>();

function checkRegisterRate(ip: string): boolean {
  const now = Date.now();
  const timestamps = (registerAttempts.get(ip) ?? []).filter((t) => now - t < REGISTER_WINDOW_MS);
  if (timestamps.length >= REGISTER_MAX) return false;
  timestamps.push(now);
  registerAttempts.set(ip, timestamps);
  return true;
}

export async function agentsPlugin(app: FastifyInstance, opts: { db: Db }): Promise<void> {
  const { db } = opts;

  // ── POST /api/agents/register ────────────────────────
  app.post<{
    Body: { handle: string; displayName?: string };
  }>('/api/agents/register', async (req, reply) => {
    const clientIp = req.ip;
    if (!checkRegisterRate(clientIp)) {
      return reply.status(429).send({ error: 'too many registration attempts, try again later' });
    }

    const { handle, displayName } = req.body;

    if (!handle || handle.length > 64) {
      return reply.status(400).send({ error: 'handle is required and must be <= 64 chars' });
    }

    // Check if handle already taken
    const existing = await db
      .select()
      .from(agents)
      .where(eq(agents.handle, handle))
      .limit(1);

    if (existing.length > 0) {
      return reply.status(409).send({ error: 'handle already taken' });
    }

    // Generate API key (48 hex chars = 24 random bytes)
    const apiKey = crypto.randomBytes(API_KEY_LENGTH / 2).toString('hex');
    const apiKeyHash = await bcrypt.hash(apiKey, 10);

    const [agent] = await db
      .insert(agents)
      .values({
        handle,
        displayName: displayName ?? handle,
        apiKeyHash,
      })
      .returning();

    return reply.status(201).send({
      agentId: agent.id,
      apiKey,
      handle: agent.handle,
    });
  });

  // ── GET /api/agents/:handle ──────────────────────────
  app.get<{
    Params: { handle: string };
  }>('/api/agents/:handle', async (req, reply) => {
    const { handle } = req.params;

    const [agent] = await db
      .select()
      .from(agents)
      .where(eq(agents.handle, handle))
      .limit(1);

    if (!agent) {
      return reply.status(404).send({ error: 'agent not found' });
    }

    const info: AgentInfo = {
      agentId: agent.id,
      displayName: agent.displayName ?? agent.handle,
      handle: agent.handle,
      status: (agent.status ?? 'offline') as AgentInfo['status'],
      lastSeen: agent.lastSeen?.toISOString(),
    };

    return reply.send(info);
  });

  // ── GET /api/agents/search?q= ────────────────────────
  app.get<{
    Querystring: { q: string };
  }>('/api/agents/search', async (req, reply) => {
    const { q } = req.query;

    if (!q || q.length < 1) {
      return reply.status(400).send({ error: 'query parameter q is required' });
    }

    const pattern = `%${q}%`;
    const results = await db
      .select()
      .from(agents)
      .where(or(ilike(agents.handle, pattern), ilike(agents.displayName, pattern)))
      .limit(50);

    const agentList: AgentInfo[] = results.map((a) => ({
      agentId: a.id,
      displayName: a.displayName ?? a.handle,
      handle: a.handle,
      status: (a.status ?? 'offline') as AgentInfo['status'],
      lastSeen: a.lastSeen?.toISOString(),
    }));

    return reply.send(agentList);
  });
}
