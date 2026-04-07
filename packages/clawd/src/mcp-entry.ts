#!/usr/bin/env node

import { createConnection } from 'node:net';
import { randomUUID } from 'node:crypto';
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { z } from 'zod';
import { CLAWD_IPC_PATH } from '@claw-im/shared';
import type { IpcRequest, IpcResponse } from '@claw-im/shared';

class IpcClient {
  private pending = new Map<string, {
    resolve: (value: IpcResponse) => void;
    reject: (err: Error) => void;
    timer: ReturnType<typeof setTimeout>;
  }>();
  private buffer = '';
  private socket: ReturnType<typeof createConnection> | null = null;
  private connected = false;

  connect(): Promise<void> {
    return new Promise((resolve, reject) => {
      this.socket = createConnection(CLAWD_IPC_PATH);

      this.socket.on('connect', () => {
        this.connected = true;
        resolve();
      });

      this.socket.on('data', (chunk) => {
        this.buffer += chunk.toString();
        this._processBuffer();
      });

      this.socket.on('error', (err) => {
        if (!this.connected) {
          reject(err);
        }
        console.error('[mcp-entry] IPC error:', err.message);
      });

      this.socket.on('close', () => {
        this.connected = false;
        // Reject all pending requests
        for (const [id, entry] of this.pending) {
          clearTimeout(entry.timer);
          entry.reject(new Error('IPC connection closed'));
          this.pending.delete(id);
        }
      });
    });
  }

  private _processBuffer(): void {
    const lines = this.buffer.split('\n');
    this.buffer = lines.pop()!; // keep incomplete last line

    for (const line of lines) {
      if (!line.trim()) continue;
      try {
        const response = JSON.parse(line) as IpcResponse;
        const entry = this.pending.get(response.id);
        if (entry) {
          clearTimeout(entry.timer);
          this.pending.delete(response.id);
          entry.resolve(response);
        }
      } catch {
        console.error('[mcp-entry] Failed to parse IPC response:', line);
      }
    }
  }

  async request(method: string, params: Record<string, unknown>): Promise<IpcResponse> {
    if (!this.socket || !this.connected) {
      throw new Error('IPC not connected');
    }

    const id = randomUUID();
    const req: IpcRequest = { id, method, params };

    return new Promise<IpcResponse>((resolve, reject) => {
      const timer = setTimeout(() => {
        this.pending.delete(id);
        reject(new Error(`IPC request timeout: ${method}`));
      }, 60_000);

      this.pending.set(id, { resolve, reject, timer });
      this.socket!.write(JSON.stringify(req) + '\n');
    });
  }

  close(): void {
    if (this.socket) {
      this.socket.destroy();
      this.socket = null;
    }
  }
}

async function main() {
  const ipc = new IpcClient();

  try {
    await ipc.connect();
  } catch (err) {
    console.error('Failed to connect to clawd daemon. Is it running?');
    process.exit(1);
  }

  const mcpServer = new McpServer({
    name: 'claw-im',
    version: '0.1.0',
  });

  mcpServer.tool(
    'send_message',
    'Send a message to another agent. Messages to friends are delivered to their mailbox; urgent messages interrupt their current task.',
    {
      to: z.string().describe('Recipient handle (e.g. @alice) or agent UUID'),
      content: z.string().describe('Message content (outbound filter will sanitize paths and block secrets)'),
      urgent: z.boolean().optional().describe('If true, message interrupts the recipient immediately instead of going to their mailbox'),
    },
    async (params) => {
      const resp = await ipc.request('send_message', params);
      if (resp.error) {
        return { content: [{ type: 'text' as const, text: resp.error }], isError: true };
      }
      const result = resp.result as { content: Array<{ type: string; text: string }>; isError?: boolean };
      return {
        content: result.content.map((c) => ({ type: 'text' as const, text: c.text })),
        isError: result.isError,
      };
    }
  );

  mcpServer.tool(
    'check_messages',
    'Read and consume messages from your mailbox (non-blocking). Messages are removed from the queue after reading — call this only when ready to process them. Returns all pending messages by default.',
    {
      limit: z.number().optional().describe('Max messages to return (default: all pending)'),
      from: z.string().optional().describe('Filter by sender handle (e.g. @alice)'),
    },
    async (params) => {
      const resp = await ipc.request('check_messages', params);
      if (resp.error) {
        return { content: [{ type: 'text' as const, text: resp.error }], isError: true };
      }
      const result = resp.result as { content: Array<{ type: string; text: string }>; isError?: boolean };
      return {
        content: result.content.map((c) => ({ type: 'text' as const, text: c.text })),
        isError: result.isError,
      };
    }
  );

  mcpServer.tool(
    'wait_for_message',
    'Block until a new message arrives in your mailbox. Use this for real-time back-and-forth conversations. Returns one message when it arrives, or times out.',
    {
      timeout_seconds: z.number().optional().describe('Timeout in seconds (default: 30, max: 3600)'),
      from: z.string().optional().describe('Only wait for messages from this handle (e.g. @alice)'),
    },
    async (params) => {
      const resp = await ipc.request('wait_for_message', params);
      if (resp.error) {
        return { content: [{ type: 'text' as const, text: resp.error }], isError: true };
      }
      const result = resp.result as { content: Array<{ type: string; text: string }>; isError?: boolean };
      return {
        content: result.content.map((c) => ({ type: 'text' as const, text: c.text })),
        isError: result.isError,
      };
    }
  );

  mcpServer.tool(
    'list_agents',
    'Query the cloud server for registered agents. Returns each agent\'s handle, display name, and online status.',
    {
      online_only: z.boolean().optional().describe('If true, only return agents currently online'),
    },
    async (params) => {
      const resp = await ipc.request('list_agents', params);
      if (resp.error) {
        return { content: [{ type: 'text' as const, text: resp.error }], isError: true };
      }
      const result = resp.result as { content: Array<{ type: string; text: string }>; isError?: boolean };
      return {
        content: result.content.map((c) => ({ type: 'text' as const, text: c.text })),
        isError: result.isError,
      };
    }
  );

  mcpServer.tool(
    'add_contact',
    'Add or update a contact in your local contact list. Contacts determine message routing: friends get mailbox delivery, strangers go to digest.',
    {
      agent_id: z.string().describe('Agent handle (e.g. @alice) or UUID'),
      tier: z.enum(['friend', 'stranger']).optional().describe('Contact tier (default: friend). Friends can collaborate freely; strangers have limited access.'),
      alias: z.string().optional().describe('Custom display alias for this contact'),
    },
    async (params) => {
      const resp = await ipc.request('add_contact', params);
      if (resp.error) {
        return { content: [{ type: 'text' as const, text: resp.error }], isError: true };
      }
      const result = resp.result as { content: Array<{ type: string; text: string }>; isError?: boolean };
      return {
        content: result.content.map((c) => ({ type: 'text' as const, text: c.text })),
        isError: result.isError,
      };
    }
  );

  mcpServer.tool(
    'get_digest',
    'Get accumulated low-priority messages from strangers and unrecognized agents. These are batched instead of delivered individually. Clears the digest after reading.',
    {},
    async () => {
      const resp = await ipc.request('get_digest', {});
      if (resp.error) {
        return { content: [{ type: 'text' as const, text: resp.error }], isError: true };
      }
      const result = resp.result as { content: Array<{ type: string; text: string }>; isError?: boolean };
      return {
        content: result.content.map((c) => ({ type: 'text' as const, text: c.text })),
        isError: result.isError,
      };
    }
  );

  mcpServer.tool(
    'my_status',
    'Get or set your agent status. Omit the status parameter to retrieve your current status, handle, and connection info.',
    {
      status: z
        .enum(['online', 'busy', 'dnd', 'offline'])
        .optional()
        .describe('New status to set. Omit to return current status info.'),
    },
    async (params) => {
      const resp = await ipc.request('my_status', params);
      if (resp.error) {
        return { content: [{ type: 'text' as const, text: resp.error }], isError: true };
      }
      const result = resp.result as { content: Array<{ type: string; text: string }>; isError?: boolean };
      return {
        content: result.content.map((c) => ({ type: 'text' as const, text: c.text })),
        isError: result.isError,
      };
    }
  );

  const transport = new StdioServerTransport();
  await mcpServer.connect(transport);

  process.on('SIGINT', () => {
    ipc.close();
    process.exit(0);
  });

  process.on('SIGTERM', () => {
    ipc.close();
    process.exit(0);
  });
}

main().catch((err) => {
  console.error('[mcp-entry] Fatal error:', err);
  process.exit(1);
});
