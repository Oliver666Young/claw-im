import type { FastifyInstance } from 'fastify';
import { eq, and } from 'drizzle-orm';
import { contacts, agents } from '../db/schema.js';
import type { Db } from '../db/drizzle.js';
import { buildAuthHook } from './auth.js';

export async function contactsPlugin(app: FastifyInstance, opts: { db: Db }): Promise<void> {
  const { db } = opts;

  // Verify x-agent-id + x-api-key headers for all routes in this plugin
  app.addHook('preHandler', buildAuthHook(db));

  // ── POST /api/contacts ───────────────────────────────
  app.post<{
    Body: { contactId: string; tier?: string; alias?: string };
  }>('/api/contacts', async (req, reply) => {
    const agentId = (req as any).agentId as string;
    const { contactId, tier, alias } = req.body;

    if (!contactId) {
      return reply.status(400).send({ error: 'contactId is required' });
    }

    // Verify contact agent exists
    const [target] = await db
      .select()
      .from(agents)
      .where(eq(agents.id, contactId))
      .limit(1);

    if (!target) {
      return reply.status(404).send({ error: 'contact agent not found' });
    }

    const [contact] = await db
      .insert(contacts)
      .values({
        ownerId: agentId,
        contactId,
        tier: tier ?? 'stranger',
        alias,
      })
      .returning();

    return reply.status(201).send(contact);
  });

  // ── GET /api/contacts ────────────────────────────────
  app.get('/api/contacts', async (req, reply) => {
    const agentId = (req as any).agentId as string;

    const contactList = await db
      .select()
      .from(contacts)
      .where(eq(contacts.ownerId, agentId));

    return reply.send(contactList);
  });

  // ── PUT /api/contacts/:contactId ─────────────────────
  app.put<{
    Params: { contactId: string };
    Body: { tier?: string; alias?: string; blocked?: boolean };
  }>('/api/contacts/:contactId', async (req, reply) => {
    const agentId = (req as any).agentId as string;
    const { contactId } = req.params;
    const { tier, alias, blocked } = req.body;

    const updates: Record<string, unknown> = {};
    if (tier !== undefined) updates.tier = tier;
    if (alias !== undefined) updates.alias = alias;
    if (blocked !== undefined) updates.blocked = blocked;

    if (Object.keys(updates).length === 0) {
      return reply.status(400).send({ error: 'no fields to update' });
    }

    const result = await db
      .update(contacts)
      .set(updates)
      .where(and(eq(contacts.ownerId, agentId), eq(contacts.contactId, contactId)))
      .returning();

    if (result.length === 0) {
      return reply.status(404).send({ error: 'contact not found' });
    }

    return reply.send(result[0]);
  });

  // ── DELETE /api/contacts/:contactId ──────────────────
  app.delete<{
    Params: { contactId: string };
  }>('/api/contacts/:contactId', async (req, reply) => {
    const agentId = (req as any).agentId as string;
    const { contactId } = req.params;

    const result = await db
      .delete(contacts)
      .where(and(eq(contacts.ownerId, agentId), eq(contacts.contactId, contactId)))
      .returning();

    if (result.length === 0) {
      return reply.status(404).send({ error: 'contact not found' });
    }

    return reply.status(204).send();
  });
}
