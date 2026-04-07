#!/usr/bin/env node

import { Command } from 'commander';
import { fork, execSync } from 'node:child_process';
import { readFileSync, writeFileSync, existsSync, unlinkSync } from 'node:fs';
import { createInterface } from 'node:readline';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import {
  CONFIG_DIR,
  LOGS_DIR,
  CLOUD_DEFAULT_URL,
  CLAWD_BASE_URL,
  AUDIT_LOG_PATH,
} from '@claw-im/shared';
import type { ClawConfig, Tier } from '@claw-im/shared';
import { loadConfig, saveConfig, ensureConfigDir } from './config.js';
import { setupClaudeCode } from './setup-hooks.js';

const PID_PATH = `${CONFIG_DIR}/clawd.pid`;
const LOG_FILE = `${LOGS_DIR}/clawd.log`;

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

function prompt(question: string): Promise<string> {
  const rl = createInterface({
    input: process.stdin,
    output: process.stdout,
  });
  return new Promise((resolve) => {
    rl.question(question, (answer) => {
      rl.close();
      resolve(answer.trim());
    });
  });
}

function isDaemonRunning(): { running: boolean; pid?: number } {
  if (!existsSync(PID_PATH)) return { running: false };

  try {
    const pid = parseInt(readFileSync(PID_PATH, 'utf-8').trim(), 10);
    process.kill(pid, 0);
    return { running: true, pid };
  } catch {
    try { unlinkSync(PID_PATH); } catch { /* ignore */ }
    return { running: false };
  }
}

function requireConfig(): ClawConfig {
  const config = loadConfig();
  if (!config) {
    console.error('No config found.');
    console.error('  → Run \'clawd init\' to set up');
    process.exit(1);
  }
  return config;
}

function requireDaemon(): { pid: number } {
  const { running, pid } = isDaemonRunning();
  if (!running || !pid) {
    console.error('Daemon is not running.');
    console.error('  → Run \'clawd start\' to launch');
    process.exit(1);
  }
  return { pid };
}

function padRight(str: string, len: number): string {
  return str.length >= len ? str : str + ' '.repeat(len - str.length);
}

const program = new Command();

program
  .name('clawd')
  .description('Claw IM daemon - Agent-to-agent messaging')
  .version('0.1.0');

// ─── init ─────────────────────────────────────────────
program
  .command('init')
  .description('Initialize Claw IM configuration')
  .action(async () => {
    ensureConfigDir();

    const existing = loadConfig();
    if (existing) {
      const overwrite = await prompt(
        'Config already exists. Overwrite? (y/N): '
      );
      if (overwrite.toLowerCase() !== 'y') {
        console.log('Aborted.');
        process.exit(0);
      }
    }

    const handle = await prompt('Handle (e.g. @myagent): ');
    const displayName = await prompt('Display name: ');
    const cloudUrl =
      (await prompt(`Cloud URL (default: ${CLOUD_DEFAULT_URL}): `)) ||
      CLOUD_DEFAULT_URL;

    // Register with cloud server
    const httpUrl = cloudUrl.replace(/^ws/, 'http');
    console.log(`Registering with ${httpUrl}...`);

    try {
      const res = await fetch(`${httpUrl}/api/agents/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ handle, displayName }),
      });

      if (!res.ok) {
        const errBody = await res.text();
        console.error(`Registration failed: ${res.status} ${errBody}`);
        console.error('  → Check that the cloud server is running');
        console.error(`  → Verify the URL: ${httpUrl}`);
        process.exit(1);
      }

      const data = (await res.json()) as {
        agentId: string;
        apiKey: string;
      };

      const config: ClawConfig = {
        agentId: data.agentId,
        apiKey: data.apiKey,
        cloudUrl,
        displayName,
        handle,
        safety: {
          neverShare: [],
          auditLog: true,
        },
      };

      saveConfig(config);

      // Auto-configure Claude Code hooks
      try {
        setupClaudeCode();
        console.log('');
        console.log(`✓ Registered as ${handle} (Agent ID: ${data.agentId})`);
        console.log('✓ Claude Code hooks configured');
        console.log('✓ MCP server configured');
      } catch (hookErr) {
        console.log('');
        console.log(`✓ Registered as ${handle} (Agent ID: ${data.agentId})`);
        console.warn(`⚠ Could not auto-configure Claude Code hooks: ${hookErr instanceof Error ? hookErr.message : String(hookErr)}`);
        console.log('  → Run \'clawd setup-hooks\' to retry');
      }

      console.log('');
      console.log('→ Run \'clawd start\' to launch daemon');
      console.log('→ Add friends: \'clawd contacts add @friend --tier friend\'');
    } catch (err) {
      console.error(
        `Failed to connect to cloud server: ${err instanceof Error ? err.message : String(err)}`
      );
      console.error('  → Check your internet connection');
      console.error(`  → Verify cloud URL: ${cloudUrl}`);
      process.exit(1);
    }
  });

// ─── setup-hooks ─────────────────────────────────────
program
  .command('setup-hooks')
  .description('Configure Claude Code hooks and MCP server')
  .action(() => {
    try {
      const result = setupClaudeCode();
      console.log('✓ Claude Code hooks configured');
      if (result.sessionStartCreated) {
        console.log('  Created session-start.sh');
      }
      console.log('  PostToolUse hook: OK');
      console.log('  SessionStart hook: OK');
      console.log('  MCP server "claw-im": OK');
    } catch (err) {
      console.error(`Failed to configure hooks: ${err instanceof Error ? err.message : String(err)}`);
      process.exit(1);
    }
  });

// ─── start ────────────────────────────────────────────
program
  .command('start')
  .description('Start the clawd daemon')
  .option('--fg', 'Run in foreground')
  .action(async (opts: { fg?: boolean }) => {
    const config = requireConfig();

    const { running, pid } = isDaemonRunning();
    if (running) {
      console.log(`Daemon already running (PID ${pid}).`);
      process.exit(0);
    }

    ensureConfigDir();

    if (opts.fg) {
      console.log('Starting clawd in foreground...');
      const { ClawDaemon } = await import('./daemon.js');
      const daemon = new ClawDaemon(config);

      const shutdown = async () => {
        await daemon.stop();
        process.exit(0);
      };

      process.on('SIGINT', () => void shutdown());
      process.on('SIGTERM', () => void shutdown());

      await daemon.start();
    } else {
      const child = fork(
        fileURLToPath(import.meta.url),
        ['_run-daemon'],
        {
          detached: true,
          stdio: ['ignore', 'pipe', 'pipe', 'ipc'],
          env: { ...process.env, CLAWD_DAEMON: '1' },
        }
      );

      child.unref();

      if (child.pid) {
        writeFileSync(PID_PATH, String(child.pid));
        console.log(`Daemon started (PID ${child.pid}).`);
        console.log(`Logs: ${LOG_FILE}`);
      }

      const { createWriteStream } = await import('node:fs');
      const logStream = createWriteStream(LOG_FILE, { flags: 'a' });
      child.stdout?.pipe(logStream);
      child.stderr?.pipe(logStream);

      child.disconnect();
      process.exit(0);
    }
  });

// ─── _run-daemon (internal) ──────────────────────────
program
  .command('_run-daemon', { hidden: true })
  .action(async () => {
    const config = loadConfig();
    if (!config) {
      console.error('No config found.');
      process.exit(1);
    }

    writeFileSync(PID_PATH, String(process.pid));

    const { ClawDaemon } = await import('./daemon.js');
    const daemon = new ClawDaemon(config);

    const shutdown = async () => {
      try { unlinkSync(PID_PATH); } catch { /* ignore */ }
      await daemon.stop();
      process.exit(0);
    };

    process.on('SIGINT', () => void shutdown());
    process.on('SIGTERM', () => void shutdown());

    try {
      await daemon.start();
    } catch (err) {
      console.error('Failed to start daemon:', err);
      try { unlinkSync(PID_PATH); } catch { /* ignore */ }
      process.exit(1);
    }
  });

// ─── stop ─────────────────────────────────────────────
program
  .command('stop')
  .description('Stop the clawd daemon')
  .action(() => {
    const { running, pid } = isDaemonRunning();
    if (!running || !pid) {
      console.log('Daemon is not running.');
      return;
    }

    try {
      process.kill(pid, 'SIGTERM');
      console.log(`Sent SIGTERM to daemon (PID ${pid}).`);
      setTimeout(() => {
        try { unlinkSync(PID_PATH); } catch { /* ignore */ }
      }, 500);
    } catch (err) {
      console.error(`Failed to stop daemon: ${err instanceof Error ? err.message : String(err)}`);
      try { unlinkSync(PID_PATH); } catch { /* ignore */ }
    }
  });

// ─── status ───────────────────────────────────────────
program
  .command('status')
  .description('Show daemon and agent status')
  .action(async () => {
    const config = loadConfig();
    const { running, pid } = isDaemonRunning();

    console.log('=== Claw IM Status ===');

    if (!config) {
      console.log('Config:  Not found');
      console.log('  → Run \'clawd init\' to set up');
      return;
    }

    console.log(`Handle:   ${config.handle}`);
    console.log(`Agent ID: ${config.agentId}`);
    console.log(`Cloud:    ${config.cloudUrl}`);
    console.log(`Daemon:   ${running ? `Running (PID ${pid})` : 'Stopped'}`);

    if (!running) {
      console.log('  → Run \'clawd start\' to launch');
      return;
    }

    // Query daemon for extended status
    try {
      const res = await fetch(`${CLAWD_BASE_URL}/status/unread`);
      const data = (await res.json()) as { unread: number };
      console.log(`Unread:   ${data.unread}`);
    } catch {
      console.log('Unread:   (could not connect to daemon)');
    }

    // Show contact count
    try {
      const { ContactDB } = await import('./contact-db.js');
      const db = new ContactDB();
      db.init();
      const contacts = db.listContacts();
      console.log(`Contacts: ${contacts.length} total`);
      db.close();
    } catch {
      // contacts db may not exist yet
    }
  });

// ─── whoami ──────────────────────────────────────────
program
  .command('whoami')
  .description('Show your agent identity')
  .action(() => {
    const config = requireConfig();
    console.log(`Handle:   ${config.handle}`);
    console.log(`Agent ID: ${config.agentId}`);
    console.log(`Name:     ${config.displayName}`);
    console.log(`Cloud:    ${config.cloudUrl}`);
  });

// ─── contacts ─────────────────────────────────────────
const contactsCmd = program
  .command('contacts')
  .description('Manage contacts');

contactsCmd
  .command('list')
  .description('List contacts')
  .option('--tier <tier>', 'Filter by tier')
  .option('--online', 'Show online only')
  .action(async (opts: { tier?: string; online?: boolean }) => {
    requireConfig();

    const { ContactDB } = await import('./contact-db.js');
    const db = new ContactDB();
    db.init();

    const contacts = db.listContacts({
      tier: opts.tier as Tier | undefined,
    });

    if (contacts.length === 0) {
      console.log('No contacts found.');
      console.log('  → Add one: \'clawd contacts add @handle --tier friend\'');
    } else {
      // Table format
      const header = {
        handle: 'HANDLE',
        alias: 'ALIAS',
        tier: 'TIER',
        lastMsg: 'LAST MSG',
        status: 'STATUS',
      };

      const rows = contacts.map((c) => ({
        handle: c.agentId,
        alias: c.alias ?? '-',
        tier: c.tier,
        lastMsg: c.lastMessageAt
          ? new Date(c.lastMessageAt).toLocaleDateString()
          : '-',
        status: c.blocked ? 'BLOCKED' : '-',
      }));

      // Calculate column widths
      const colW = {
        handle: Math.max(header.handle.length, ...rows.map((r) => r.handle.length)),
        alias: Math.max(header.alias.length, ...rows.map((r) => r.alias.length)),
        tier: Math.max(header.tier.length, ...rows.map((r) => r.tier.length)),
        lastMsg: Math.max(header.lastMsg.length, ...rows.map((r) => r.lastMsg.length)),
        status: Math.max(header.status.length, ...rows.map((r) => r.status.length)),
      };

      const formatRow = (r: typeof header) =>
        `  ${padRight(r.handle, colW.handle)}  ${padRight(r.alias, colW.alias)}  ${padRight(r.tier, colW.tier)}  ${padRight(r.lastMsg, colW.lastMsg)}  ${r.status}`;

      console.log(formatRow(header));
      console.log(`  ${'─'.repeat(colW.handle)}  ${'─'.repeat(colW.alias)}  ${'─'.repeat(colW.tier)}  ${'─'.repeat(colW.lastMsg)}  ${'─'.repeat(colW.status)}`);
      for (const r of rows) {
        console.log(formatRow(r));
      }
      console.log(`\n  (${contacts.length} total)`);
    }

    db.close();
  });

contactsCmd
  .command('add <handle>')
  .description('Add a contact')
  .option('--tier <tier>', 'Set tier (friend/stranger)', 'friend')
  .option('--alias <alias>', 'Set alias')
  .action(async (handle: string, opts: { tier: string; alias?: string }) => {
    requireConfig();

    const { ContactDB } = await import('./contact-db.js');
    const db = new ContactDB();
    db.init();

    db.upsertContact({
      agentId: handle,
      tier: opts.tier as Tier,
      alias: opts.alias,
    });

    console.log(`Contact ${handle} added as ${opts.tier}.`);
    db.close();
  });

contactsCmd
  .command('tier <handle> <tier>')
  .description('Set contact tier')
  .action(async (handle: string, tier: string) => {
    if (!['self', 'friend', 'stranger'].includes(tier)) {
      console.error('Invalid tier. Use: self, friend, stranger');
      process.exit(1);
    }

    const { ContactDB } = await import('./contact-db.js');
    const db = new ContactDB();
    db.init();

    db.setTier(handle, tier as Tier);
    console.log(`${handle} set to tier: ${tier}`);
    db.close();
  });

contactsCmd
  .command('block <handle>')
  .description('Block a contact')
  .action(async (handle: string) => {
    const { ContactDB } = await import('./contact-db.js');
    const db = new ContactDB();
    db.init();

    db.setBlocked(handle, true);
    console.log(`${handle} blocked.`);
    db.close();
  });

// ─── msg ──────────────────────────────────────────────
program
  .command('msg <handle> <content>')
  .description('Quick send a message')
  .action(async (handle: string, content: string) => {
    const { running } = isDaemonRunning();
    if (!running) {
      console.error('Daemon is not running.');
      console.error('  → Run \'clawd start\' to launch');
      process.exit(1);
    }

    try {
      const { createConnection } = await import('node:net');
      const { randomUUID } = await import('node:crypto');
      const { CLAWD_IPC_PATH } = await import('@claw-im/shared');

      const socket = createConnection(CLAWD_IPC_PATH);

      await new Promise<void>((resolve, reject) => {
        socket.on('connect', resolve);
        socket.on('error', (err) => {
          reject(err);
        });
      });

      const id = randomUUID();
      const req = {
        id,
        method: 'send_message',
        params: { to: handle, content },
      };

      socket.write(JSON.stringify(req) + '\n');

      const response = await new Promise<string>((resolve) => {
        let buf = '';
        socket.on('data', (chunk) => {
          buf += chunk.toString();
          const idx = buf.indexOf('\n');
          if (idx >= 0) {
            resolve(buf.substring(0, idx));
          }
        });
      });

      const parsed = JSON.parse(response) as { result?: { content?: Array<{ text: string }> }; error?: string };
      if (parsed.error) {
        console.error(`Error: ${parsed.error}`);
      } else {
        const text = parsed.result?.content?.[0]?.text ?? 'Sent.';
        console.log(text);
      }

      socket.destroy();
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      if (msg.includes('ECONNREFUSED') || msg.includes('ENOENT')) {
        console.error('Could not connect to daemon.');
        console.error('  → Is the daemon running? Try \'clawd status\'');
      } else {
        console.error(`Failed to send message: ${msg}`);
      }
      process.exit(1);
    }
  });

// ─── history ─────────────────────────────────────────
program
  .command('history [handle]')
  .description('Show recent messages from audit log')
  .option('-n, --lines <n>', 'Number of messages', '20')
  .option('--sent', 'Show only sent messages')
  .action(async (handle: string | undefined, opts: { lines: string; sent?: boolean }) => {
    requireConfig();

    if (!existsSync(AUDIT_LOG_PATH)) {
      console.log('No message history found.');
      return;
    }

    try {
      const raw = readFileSync(AUDIT_LOG_PATH, 'utf-8');
      const lines = raw.trim().split('\n').filter(Boolean);

      let entries = lines.map((line) => {
        try { return JSON.parse(line) as { ts: string; direction: string; from?: string; to?: string; content?: string }; }
        catch { return null; }
      }).filter((e): e is NonNullable<typeof e> => e !== null);

      if (handle) {
        entries = entries.filter(
          (e) => e.from === handle || e.to === handle
        );
      }

      if (opts.sent) {
        entries = entries.filter((e) => e.direction === 'outbound');
      }

      const limit = parseInt(opts.lines, 10) || 20;
      const recent = entries.slice(-limit);

      if (recent.length === 0) {
        console.log('No messages found.');
        return;
      }

      for (const e of recent) {
        const ts = new Date(e.ts).toLocaleString();
        const dir = e.direction === 'outbound' ? '→' : '←';
        const peer = e.direction === 'outbound' ? e.to : e.from;
        const preview = (e.content ?? '').substring(0, 80);
        console.log(`  ${ts} ${dir} ${peer}: ${preview}`);
      }

      console.log(`\n  (${recent.length} messages shown)`);
    } catch (err) {
      console.error(`Failed to read history: ${err instanceof Error ? err.message : String(err)}`);
    }
  });

// ─── panic ────────────────────────────────────────────
program
  .command('panic')
  .description('Emergency stop all communications')
  .action(() => {
    // Show last outbound messages before killing
    if (existsSync(AUDIT_LOG_PATH)) {
      try {
        const raw = readFileSync(AUDIT_LOG_PATH, 'utf-8');
        const lines = raw.trim().split('\n').filter(Boolean);
        const outbound = lines
          .map((line) => {
            try { return JSON.parse(line) as { ts: string; direction: string; to?: string; content?: string }; }
            catch { return null; }
          })
          .filter((e): e is NonNullable<typeof e> => e !== null && e.direction === 'outbound')
          .slice(-5);

        if (outbound.length > 0) {
          console.log('Last outbound messages:');
          for (const e of outbound) {
            const ts = new Date(e.ts).toLocaleString();
            const preview = (e.content ?? '').substring(0, 60);
            console.log(`  ${ts} → ${e.to}: ${preview}`);
          }
          console.log('');
        }
      } catch {
        // ignore audit read errors during panic
      }
    }

    const { running, pid } = isDaemonRunning();

    if (running && pid) {
      try {
        process.kill(pid, 'SIGKILL');
        console.log(`Daemon killed (PID ${pid}).`);
      } catch { /* ignore */ }
    }

    try { unlinkSync(PID_PATH); } catch { /* ignore */ }
    try { unlinkSync('/tmp/clawd.sock'); } catch { /* ignore */ }

    console.log('All communications stopped.');
  });

// ─── logs ─────────────────────────────────────────────
program
  .command('logs')
  .description('Tail daemon logs')
  .option('-f, --follow', 'Follow log output')
  .option('-n, --lines <n>', 'Number of lines', '50')
  .action((opts: { follow?: boolean; lines: string }) => {
    if (!existsSync(LOG_FILE)) {
      console.log('No log file found.');
      console.log('  → Start the daemon first: \'clawd start\'');
      return;
    }

    try {
      const args = opts.follow ? ['-f', '-n', opts.lines, LOG_FILE] : ['-n', opts.lines, LOG_FILE];
      execSync(`tail ${args.join(' ')}`, { stdio: 'inherit' });
    } catch {
      // tail exits with error on Ctrl+C, that's fine
    }
  });

program.parse();
