import type { FastifyInstance } from 'fastify';
import type { WebSocket } from '@fastify/websocket';
import bcrypt from 'bcrypt';
import crypto from 'node:crypto';
import { eq, and, or, desc, lt } from 'drizzle-orm';
import type {
  ClientMessage,
  WsAuthOk,
  WsAuthError,
  WsNewMessage,
  WsMessageAck,
  WsSyncResponse,
  WsPong,
  WsAgentList,
  WsError,
  Message,
  AgentInfo,
} from '@claw-im/shared';
import { MESSAGE_LENGTH_LIMIT } from '@claw-im/shared';
import { broker } from './broker.js';
import { agents, messages, contacts } from '../db/schema.js';
import type { Db } from '../db/drizzle.js';

// ─── Rate limiter (per-agent, in-memory) ────────────────
const WS_RATE_WINDOW_MS = 60_000;
const WS_RATE_MAX = 60; // messages per minute
const wsRateMap = new Map<string, number[]>();

function checkWsRate(agentId: string): boolean {
  const now = Date.now();
  const timestamps = (wsRateMap.get(agentId) ?? []).filter((t) => now - t < WS_RATE_WINDOW_MS);
  if (timestamps.length >= WS_RATE_MAX) return false;
  timestamps.push(now);
  wsRateMap.set(agentId, timestamps);
  return true;
}

// ─── Validation helpers ─────────────────────────────────
function validateSendMessage(msg: any): msg is { type: 'send_message'; to: string; content: string; metadata?: any; requestId?: string } {
  return (
    msg.type === 'send_message' &&
    typeof msg.to === 'string' && msg.to.length > 0 &&
    typeof msg.content === 'string'
  );
}

export function registerWsHandler(app: FastifyInstance, db: Db): void {
  const log = app.log;

  app.get('/ws', { websocket: true }, (socket: WebSocket) => {
    let agentId: string | null = null;
    let authenticated = false;

    const sendJson = (data: unknown) => {
      if (socket.readyState === 1 /* OPEN */) {
        socket.send(JSON.stringify(data));
      }
    };

    // Auth timeout — must authenticate within 10 seconds
    const authTimer = setTimeout(() => {
      if (!authenticated) {
        const err: WsAuthError = { type: 'auth_error', reason: 'auth timeout' };
        sendJson(err);
        socket.close(4001, 'auth timeout');
      }
    }, 10_000);

    socket.on('message', async (raw: Buffer | string) => {
      let msg: ClientMessage;
      try {
        msg = JSON.parse(typeof raw === 'string' ? raw : raw.toString());
      } catch {
        const err: WsError = { type: 'error', code: 'PARSE_ERROR', message: 'Invalid JSON' };
        sendJson(err);
        return;
      }

      // ── Auth flow ──────────────────────────────────────
      if (!authenticated) {
        if (msg.type !== 'auth') {
          const err: WsAuthError = { type: 'auth_error', reason: 'must authenticate first' };
          sendJson(err);
          socket.close(4001, 'not authenticated');
          return;
        }

        clearTimeout(authTimer);

        const agent = await db
          .select()
          .from(agents)
          .where(eq(agents.id, msg.agentId))
          .limit(1);

        if (agent.length === 0) {
          log.warn({ agentId: msg.agentId, reason: 'agent not found' }, 'ws auth failure');
          const err: WsAuthError = { type: 'auth_error', reason: 'agent not found' };
          sendJson(err);
          socket.close(4002, 'agent not found');
          return;
        }

        const valid = await bcrypt.compare(msg.apiKey, agent[0].apiKeyHash);
        if (!valid) {
          log.warn({ agentId: msg.agentId, reason: 'invalid api key' }, 'ws auth failure');
          const err: WsAuthError = { type: 'auth_error', reason: 'invalid api key' };
          sendJson(err);
          socket.close(4003, 'invalid api key');
          return;
        }

        agentId = msg.agentId;
        authenticated = true;
        const verifiedId = agentId;
        broker.register(verifiedId, socket);
        log.info({ agentId: verifiedId, handle: agent[0].handle }, 'agent connected');

        // Update status to online
        await db
          .update(agents)
          .set({ status: 'online' })
          .where(eq(agents.id, verifiedId));

        const agentInfo: AgentInfo = {
          agentId: agent[0].id,
          displayName: agent[0].displayName ?? agent[0].handle,
          handle: agent[0].handle,
          status: 'online',
        };

        const ok: WsAuthOk = { type: 'auth_ok', agent: agentInfo };
        sendJson(ok);
        return;
      }

      // ── Rate limiting ──────────────────────────────────
      if (!checkWsRate(agentId!)) {
        log.warn({ agentId }, 'ws rate limit hit');
        const err: WsError = { type: 'error', code: 'RATE_LIMITED', message: 'Too many messages, slow down' };
        sendJson(err);
        return;
      }

      // Track activity for heartbeat pruning
      broker.touchActivity(agentId!);

      // ── Authenticated message handling ─────────────────
      switch (msg.type) {
        case 'send_message':
          if (!validateSendMessage(msg)) {
            const err: WsError = { type: 'error', code: 'INVALID_MESSAGE', message: 'send_message requires to (string) and content (string)' };
            sendJson(err);
            break;
          }
          await handleSendMessage(db, agentId!, msg, sendJson, log);
          break;
        case 'sync_request':
          await handleSyncRequest(db, agentId!, sendJson);
          break;
        case 'ping':
          if (typeof msg.ts !== 'number') {
            const err: WsError = { type: 'error', code: 'INVALID_MESSAGE', message: 'ping requires ts (number)' };
            sendJson(err);
            break;
          }
          handlePing(msg.ts, sendJson);
          break;
        case 'list_agents':
          await handleListAgents(db, msg, sendJson);
          break;
        case 'status_update':
          if (!msg.status || typeof msg.status !== 'string') {
            const err: WsError = { type: 'error', code: 'INVALID_MESSAGE', message: 'status_update requires status (string)' };
            sendJson(err);
            break;
          }
          await handleStatusUpdate(db, agentId!, msg.status, sendJson);
          break;
        default: {
          const err: WsError = { type: 'error', code: 'UNKNOWN_TYPE', message: `Unknown message type` };
          sendJson(err);
        }
      }
    });

    socket.on('close', async () => {
      clearTimeout(authTimer);
      if (agentId) {
        log.info({ agentId }, 'agent disconnected');
        broker.unregister(agentId);
        await db
          .update(agents)
          .set({ status: 'offline', lastSeen: new Date() })
          .where(eq(agents.id, agentId));
      }
    });

    socket.on('error', () => {
      clearTimeout(authTimer);
      if (agentId) {
        broker.unregister(agentId);
      }
    });
  });
}

// ─── Handler helpers ──────────────────────────────────────

// UUID v4 pattern
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

// Resolve a handle or UUID to { id, handle }. Returns null if not found.
async function resolveAgent(db: Db, identifier: string): Promise<{ id: string; handle: string; displayName: string } | null> {
  if (UUID_RE.test(identifier)) {
    const [row] = await db.select().from(agents).where(eq(agents.id, identifier)).limit(1);
    return row ? { id: row.id, handle: row.handle, displayName: row.displayName ?? row.handle } : null;
  }
  // Try as handle (with or without @ prefix)
  const handle = identifier.startsWith('@') ? identifier.slice(1) : identifier;
  const [row] = await db.select().from(agents).where(eq(agents.handle, handle)).limit(1);
  if (row) return { id: row.id, handle: row.handle, displayName: row.displayName ?? row.handle };
  // Also try with the original string as-is
  const [row2] = await db.select().from(agents).where(eq(agents.handle, identifier)).limit(1);
  return row2 ? { id: row2.id, handle: row2.handle, displayName: row2.displayName ?? row2.handle } : null;
}

async function handleSendMessage(
  db: Db,
  fromId: string,
  msg: { to: string; content: string; metadata?: Message['metadata']; requestId?: string },
  sendJson: (data: unknown) => void,
  log?: { info: (obj: object, msg: string) => void },
): Promise<void> {
  // Enforce message length limit (use friend limit as default max)
  if (msg.content.length > MESSAGE_LENGTH_LIMIT.friend) {
    const ack: WsMessageAck = {
      type: 'message_ack',
      messageId: '',
      requestId: msg.requestId,
      status: 'error',
      error: `Message too long (max ${MESSAGE_LENGTH_LIMIT.friend} bytes)`,
    };
    sendJson(ack);
    return;
  }

  // Resolve sender and recipient (handle → UUID)
  const sender = await resolveAgent(db, fromId);
  const recipient = await resolveAgent(db, msg.to);

  if (!recipient) {
    const ack: WsMessageAck = {
      type: 'message_ack',
      messageId: '',
      requestId: msg.requestId,
      status: 'error',
      error: `Agent not found: ${msg.to}`,
    };
    sendJson(ack);
    return;
  }

  const resolvedFromId = sender?.id ?? fromId;
  const resolvedToId = recipient.id;

  // Check if recipient has sender blocked
  const [blockRecord] = await db
    .select()
    .from(contacts)
    .where(and(eq(contacts.ownerId, resolvedToId), eq(contacts.contactId, resolvedFromId), eq(contacts.blocked, true)))
    .limit(1);

  if (blockRecord) {
    const ack: WsMessageAck = {
      type: 'message_ack',
      messageId: '',
      requestId: msg.requestId,
      status: 'error',
      error: 'Message could not be delivered',
    };
    sendJson(ack);
    return;
  }

  const messageId = crypto.randomUUID();

  // Store in DB (always use UUIDs)
  const [inserted] = await db
    .insert(messages)
    .values({
      id: messageId,
      fromId: resolvedFromId,
      toId: resolvedToId,
      content: msg.content,
      metadata: msg.metadata ?? {},
      delivered: false,
    })
    .returning();

  // Build the message object for delivery — use handles so daemon can identify
  const fullMessage: Message = {
    id: messageId,
    from: sender?.handle ?? fromId,
    to: recipient.handle,
    content: msg.content,
    metadata: msg.metadata ?? {},
    timestamp: inserted.createdAt!.toISOString(),
  };

  // Try to deliver via broker (broker uses UUID keys)
  const newMsg: WsNewMessage = { type: 'new_message', message: fullMessage };
  const delivered = broker.send(resolvedToId, newMsg);

  if (delivered) {
    // Mark as delivered in DB
    await db
      .update(messages)
      .set({ delivered: true })
      .where(eq(messages.id, messageId));

    log?.info({ messageId, from: resolvedFromId, to: resolvedToId, status: 'delivered' }, 'message sent');
    const ack: WsMessageAck = {
      type: 'message_ack',
      messageId,
      requestId: msg.requestId,
      status: 'delivered',
    };
    sendJson(ack);
  } else {
    log?.info({ messageId, from: resolvedFromId, to: resolvedToId, status: 'queued' }, 'message sent');
    const ack: WsMessageAck = {
      type: 'message_ack',
      messageId,
      requestId: msg.requestId,
      status: 'queued',
    };
    sendJson(ack);
  }
}

async function handleSyncRequest(
  db: Db,
  agentId: string,
  sendJson: (data: unknown) => void,
): Promise<void> {
  const undelivered = await db
    .select()
    .from(messages)
    .where(and(eq(messages.toId, agentId), eq(messages.delivered, false)))
    .orderBy(messages.createdAt);

  // Resolve UUIDs to handles for all unique agent IDs
  const uniqueIds = new Set<string>();
  for (const m of undelivered) {
    uniqueIds.add(m.fromId);
    uniqueIds.add(m.toId);
  }
  const handleMap = new Map<string, string>();
  for (const uid of uniqueIds) {
    const resolved = await resolveAgent(db, uid);
    if (resolved) handleMap.set(uid, resolved.handle);
  }

  const mapped: Message[] = undelivered.map((m) => ({
    id: m.id,
    from: handleMap.get(m.fromId) ?? m.fromId,
    to: handleMap.get(m.toId) ?? m.toId,
    content: m.content,
    metadata: (m.metadata ?? {}) as Message['metadata'],
    timestamp: m.createdAt!.toISOString(),
  }));

  const resp: WsSyncResponse = {
    type: 'sync_response',
    messages: mapped,
    hasMore: false,
  };
  sendJson(resp);

  // Mark all as delivered
  if (undelivered.length > 0) {
    await db
      .update(messages)
      .set({ delivered: true })
      .where(and(eq(messages.toId, agentId), eq(messages.delivered, false)));
  }
}

function handlePing(ts: number, sendJson: (data: unknown) => void): void {
  const pong: WsPong = { type: 'pong', ts };
  sendJson(pong);
}

async function handleListAgents(
  db: Db,
  msg: { onlineOnly?: boolean; requestId?: string },
  sendJson: (data: unknown) => void,
): Promise<void> {
  let agentRows;
  if (msg.onlineOnly) {
    const onlineIds = broker.getOnlineAgents();
    if (onlineIds.length === 0) {
      const resp: WsAgentList = { type: 'agent_list', agents: [], requestId: msg.requestId };
      sendJson(resp);
      return;
    }
    // Query all online agents from DB for full info
    agentRows = await db
      .select()
      .from(agents)
      .where(eq(agents.status, 'online'));
  } else {
    agentRows = await db.select().from(agents);
  }

  const agentList: AgentInfo[] = agentRows.map((a) => ({
    agentId: a.id,
    displayName: a.displayName ?? a.handle,
    handle: a.handle,
    status: (a.status ?? 'offline') as AgentInfo['status'],
    lastSeen: a.lastSeen?.toISOString(),
  }));

  const resp: WsAgentList = { type: 'agent_list', agents: agentList, requestId: msg.requestId };
  sendJson(resp);
}

async function handleStatusUpdate(
  db: Db,
  agentId: string,
  status: string,
  sendJson: (data: unknown) => void,
): Promise<void> {
  await db
    .update(agents)
    .set({ status })
    .where(eq(agents.id, agentId));
}
