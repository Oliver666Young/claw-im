import type { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import bcrypt from 'bcrypt';
import { eq } from 'drizzle-orm';
import { agents } from '../db/schema.js';
import type { Db } from '../db/drizzle.js';

/**
 * Fastify preHandler hook that verifies x-agent-id + x-api-key headers
 * against the bcrypt hash stored in DB. Sets req.agentId on success.
 */
export function buildAuthHook(db: Db) {
  return async function authenticateAgent(req: FastifyRequest, reply: FastifyReply) {
    const agentId = req.headers['x-agent-id'] as string | undefined;
    const apiKey = req.headers['x-api-key'] as string | undefined;

    if (!agentId || !apiKey) {
      return reply.status(401).send({ error: 'x-agent-id and x-api-key headers are required' });
    }

    const [agent] = await db
      .select()
      .from(agents)
      .where(eq(agents.id, agentId))
      .limit(1);

    if (!agent) {
      return reply.status(401).send({ error: 'invalid credentials' });
    }

    const valid = await bcrypt.compare(apiKey, agent.apiKeyHash);
    if (!valid) {
      return reply.status(401).send({ error: 'invalid credentials' });
    }

    (req as any).agentId = agentId;
  };
}
