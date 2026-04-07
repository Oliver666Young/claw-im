import {
  pgTable,
  uuid,
  varchar,
  text,
  boolean,
  timestamp,
  jsonb,
  index,
  uniqueIndex,
  primaryKey,
} from 'drizzle-orm/pg-core';

// ─── Agents ─────────────────────────────────────────────
export const agents = pgTable(
  'agents',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    handle: varchar('handle', { length: 64 }).unique().notNull(),
    displayName: varchar('display_name', { length: 128 }),
    apiKeyHash: varchar('api_key_hash', { length: 128 }).notNull(),
    status: varchar('status', { length: 16 }).default('offline'),
    lastSeen: timestamp('last_seen'),
    createdAt: timestamp('created_at').defaultNow(),
  },
  (table) => [
    index('agents_status_idx').on(table.status),
  ],
);

// ─── Contacts ───────────────────────────────────────────
export const contacts = pgTable(
  'contacts',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    ownerId: uuid('owner_id')
      .notNull()
      .references(() => agents.id),
    contactId: uuid('contact_id')
      .notNull()
      .references(() => agents.id),
    tier: varchar('tier', { length: 16 }).default('stranger'),
    alias: varchar('alias', { length: 64 }),
    blocked: boolean('blocked').default(false),
    createdAt: timestamp('created_at').defaultNow(),
  },
  (table) => [
    uniqueIndex('contacts_owner_contact_idx').on(
      table.ownerId,
      table.contactId,
    ),
    index('contacts_owner_idx').on(table.ownerId),
  ],
);

// ─── Messages ───────────────────────────────────────────
export const messages = pgTable(
  'messages',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    fromId: uuid('from_id')
      .notNull()
      .references(() => agents.id),
    toId: uuid('to_id')
      .notNull()
      .references(() => agents.id),
    content: text('content').notNull(),
    metadata: jsonb('metadata').default({}),
    delivered: boolean('delivered').default(false),
    createdAt: timestamp('created_at').defaultNow(),
  },
  (table) => [
    index('messages_to_delivered_idx').on(table.toId, table.delivered),
    index('messages_from_created_idx').on(table.fromId, table.createdAt),
    index('messages_conversation_idx').on(table.toId, table.fromId, table.createdAt),
  ],
);

// ─── Groups ─────────────────────────────────────────────
export const groups = pgTable('groups', {
  id: uuid('id').primaryKey().defaultRandom(),
  name: varchar('name', { length: 128 }).notNull(),
  createdBy: uuid('created_by')
    .notNull()
    .references(() => agents.id),
  createdAt: timestamp('created_at').defaultNow(),
});

// ─── Group Members ──────────────────────────────────────
export const groupMembers = pgTable(
  'group_members',
  {
    groupId: uuid('group_id')
      .notNull()
      .references(() => groups.id),
    agentId: uuid('agent_id')
      .notNull()
      .references(() => agents.id),
    joinedAt: timestamp('joined_at').defaultNow(),
  },
  (table) => [
    primaryKey({ columns: [table.groupId, table.agentId] }),
  ],
);

// ─── Group Messages ─────────────────────────────────────
export const groupMessages = pgTable(
  'group_messages',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    groupId: uuid('group_id')
      .notNull()
      .references(() => groups.id),
    fromId: uuid('from_id')
      .notNull()
      .references(() => agents.id),
    content: text('content').notNull(),
    metadata: jsonb('metadata').default({}),
    createdAt: timestamp('created_at').defaultNow(),
  },
  (table) => [
    index('group_messages_group_created_idx').on(
      table.groupId,
      table.createdAt,
    ),
  ],
);
