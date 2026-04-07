import type { FastifyInstance } from 'fastify';
import { eq, and, or, lt, desc } from 'drizzle-orm';
import type { Message } from '@claw-im/shared';
import { messages } from '../db/schema.js';
import type { Db } from '../db/drizzle.js';
import { buildAuthHook } from './auth.js';

export async function messagesPlugin(app: FastifyInstance, opts: { db: Db }): Promise<void> {
  const { db } = opts;

  // Verify x-agent-id + x-api-key headers for all routes in this plugin
  app.addHook('preHandler', buildAuthHook(db));

  // ── GET /api/messages/:conversationWith ──────────────
  app.get<{
    Params: { conversationWith: string };
    Querystring: { before?: string; limit?: string };
  }>('/api/messages/:conversationWith', async (req, reply) => {
    const agentId = (req as any).agentId as string;
    const { conversationWith } = req.params;
    const limit = Math.min(parseInt(req.query.limit ?? '20', 10) || 20, 100);
    const before = req.query.before;

    // Build conditions: messages between the two agents in either direction
    const pairCondition = or(
      and(eq(messages.fromId, agentId), eq(messages.toId, conversationWith)),
      and(eq(messages.fromId, conversationWith), eq(messages.toId, agentId)),
    );

    let conditions = pairCondition;
    if (before) {
      conditions = and(pairCondition, lt(messages.createdAt, new Date(before)));
    }

    const rows = await db
      .select()
      .from(messages)
      .where(conditions!)
      .orderBy(desc(messages.createdAt))
      .limit(limit);

    const result: Message[] = rows.map((m) => ({
      id: m.id,
      from: m.fromId,
      to: m.toId,
      content: m.content,
      metadata: (m.metadata ?? {}) as Message['metadata'],
      timestamp: m.createdAt!.toISOString(),
    }));

    return reply.send(result);
  });
}
