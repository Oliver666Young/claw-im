import Database from 'better-sqlite3';
import type { Database as DatabaseType } from 'better-sqlite3';
import type { Contact, Tier } from '@claw-im/shared';
import { CONTACTS_DB_PATH } from '@claw-im/shared';

export class ContactDB {
  private db: DatabaseType;

  constructor(dbPath: string = CONTACTS_DB_PATH) {
    this.db = new Database(dbPath);
    this.db.pragma('journal_mode = WAL');
  }

  init(): void {
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS contacts (
        agent_id TEXT PRIMARY KEY,
        display_name TEXT,
        tier TEXT DEFAULT 'stranger',
        alias TEXT,
        blocked INTEGER DEFAULT 0,
        notes TEXT,
        last_message_at TEXT,
        created_at TEXT
      )
    `);

    this.db.exec(`
      CREATE TABLE IF NOT EXISTS config (
        key TEXT PRIMARY KEY,
        value TEXT
      )
    `);
  }

  getContact(agentId: string): Contact | undefined {
    const row = this.db
      .prepare('SELECT * FROM contacts WHERE agent_id = ?')
      .get(agentId) as ContactRow | undefined;

    if (!row) return undefined;
    return rowToContact(row);
  }

  upsertContact(contact: Partial<Contact> & { agentId: string }): void {
    const existing = this.getContact(contact.agentId);

    if (existing) {
      const fields: string[] = [];
      const values: unknown[] = [];

      if (contact.displayName !== undefined) {
        fields.push('display_name = ?');
        values.push(contact.displayName);
      }
      if (contact.tier !== undefined) {
        fields.push('tier = ?');
        values.push(contact.tier);
      }
      if (contact.alias !== undefined) {
        fields.push('alias = ?');
        values.push(contact.alias);
      }
      if (contact.blocked !== undefined) {
        fields.push('blocked = ?');
        values.push(contact.blocked ? 1 : 0);
      }
      if (contact.notes !== undefined) {
        fields.push('notes = ?');
        values.push(contact.notes);
      }
      if (contact.lastMessageAt !== undefined) {
        fields.push('last_message_at = ?');
        values.push(contact.lastMessageAt);
      }

      if (fields.length > 0) {
        values.push(contact.agentId);
        this.db
          .prepare(`UPDATE contacts SET ${fields.join(', ')} WHERE agent_id = ?`)
          .run(...values);
      }
    } else {
      this.db
        .prepare(
          `INSERT INTO contacts (agent_id, display_name, tier, alias, blocked, notes, last_message_at, created_at)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?)`
        )
        .run(
          contact.agentId,
          contact.displayName ?? null,
          contact.tier ?? 'stranger',
          contact.alias ?? null,
          contact.blocked ? 1 : 0,
          contact.notes ?? null,
          contact.lastMessageAt ?? null,
          contact.createdAt ?? new Date().toISOString()
        );
    }
  }

  listContacts(opts?: { tier?: Tier; blocked?: boolean }): Contact[] {
    let sql = 'SELECT * FROM contacts WHERE 1=1';
    const params: unknown[] = [];

    if (opts?.tier !== undefined) {
      sql += ' AND tier = ?';
      params.push(opts.tier);
    }
    if (opts?.blocked !== undefined) {
      sql += ' AND blocked = ?';
      params.push(opts.blocked ? 1 : 0);
    }

    sql += ' ORDER BY last_message_at DESC';

    const rows = this.db.prepare(sql).all(...params) as ContactRow[];
    return rows.map(rowToContact);
  }

  setTier(agentId: string, tier: Tier): void {
    this.upsertContact({ agentId, tier });
  }

  setBlocked(agentId: string, blocked: boolean): void {
    this.upsertContact({ agentId, blocked });
  }

  deleteContact(agentId: string): void {
    this.db.prepare('DELETE FROM contacts WHERE agent_id = ?').run(agentId);
  }

  getConfig(key: string): string | undefined {
    const row = this.db
      .prepare('SELECT value FROM config WHERE key = ?')
      .get(key) as { value: string } | undefined;
    return row?.value;
  }

  setConfig(key: string, value: string): void {
    this.db
      .prepare(
        'INSERT OR REPLACE INTO config (key, value) VALUES (?, ?)'
      )
      .run(key, value);
  }

  close(): void {
    this.db.close();
  }
}

interface ContactRow {
  agent_id: string;
  display_name: string | null;
  tier: string;
  alias: string | null;
  blocked: number;
  notes: string | null;
  last_message_at: string | null;
  created_at: string | null;
}

function rowToContact(row: ContactRow): Contact {
  return {
    agentId: row.agent_id,
    displayName: row.display_name ?? '',
    tier: row.tier as Tier,
    alias: row.alias ?? undefined,
    blocked: row.blocked === 1,
    notes: row.notes ?? undefined,
    lastMessageAt: row.last_message_at ?? undefined,
    createdAt: row.created_at ?? new Date().toISOString(),
  };
}
