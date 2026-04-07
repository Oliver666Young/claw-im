import { randomUUID } from 'node:crypto';
import { appendFileSync } from 'node:fs';
import type { Message, AgentStatus, Tier } from '@claw-im/shared';
import { MESSAGE_LENGTH_LIMIT, AUDIT_LOG_PATH } from '@claw-im/shared';
import type { CloudClient } from './cloud-client.js';
import type { MessageQueue } from './message-queue.js';
import type { ContactDB } from './contact-db.js';
import type { MessageRouter } from './message-router.js';
import { RateLimiter } from './rate-limiter.js';
import { filterMessage } from './outbound-filter.js';

export interface McpToolResult {
  content: Array<{ type: 'text'; text: string }>;
  isError?: boolean;
}

function textResult(text: string, isError = false): McpToolResult {
  return { content: [{ type: 'text', text }], isError };
}

export class McpToolHandler {
  private cloudClient: CloudClient;
  private messageQueue: MessageQueue;
  private contactDB: ContactDB;
  private messageRouter: MessageRouter;
  private agentId: string;
  private rateLimiter = new RateLimiter();
  private auditLog: boolean;

  constructor(deps: {
    cloudClient: CloudClient;
    messageQueue: MessageQueue;
    contactDB: ContactDB;
    messageRouter: MessageRouter;
    agentId: string;
    auditLog?: boolean;
  }) {
    this.cloudClient = deps.cloudClient;
    this.messageQueue = deps.messageQueue;
    this.contactDB = deps.contactDB;
    this.messageRouter = deps.messageRouter;
    this.agentId = deps.agentId;
    this.auditLog = deps.auditLog ?? false;
  }

  async handleCall(
    method: string,
    params: Record<string, unknown>
  ): Promise<McpToolResult> {
    switch (method) {
      case 'send_message':
        return this.sendMessage(params);
      case 'check_messages':
        return this.checkMessages(params);
      case 'wait_for_message':
        return this.waitForMessage(params);
      case 'list_agents':
        return this.listAgents(params);
      case 'add_contact':
        return this.addContact(params);
      case 'get_digest':
        return this.getDigest();
      case 'my_status':
        return this.myStatus(params);
      default:
        return textResult(`Unknown method: ${method}`, true);
    }
  }

  private async sendMessage(
    params: Record<string, unknown>
  ): Promise<McpToolResult> {
    const to = params.to as string;
    const content = params.content as string;
    const urgent = params.urgent as boolean | undefined;

    if (!to || !content) {
      return textResult('Missing required parameters: to, content', true);
    }

    // Determine tier for outbound filter
    const contact = this.contactDB.getContact(to);
    const tier: Tier = contact?.tier ?? 'stranger';

    // Check message length against tier limit
    const maxLen = MESSAGE_LENGTH_LIMIT[tier];
    if (content.length > maxLen) {
      return textResult(
        `Message too long for ${tier} tier: ${content.length} chars exceeds limit of ${maxLen}.`,
        true
      );
    }

    // Check rate limit
    if (!this.rateLimiter.check(to, tier)) {
      const remaining = this.rateLimiter.remaining(to, tier);
      return textResult(
        `Rate limit exceeded for ${tier} tier (${to}). ${remaining} messages remaining this minute. Try again shortly.`,
        true
      );
    }

    const filterResult = filterMessage(content, tier);
    if (!filterResult.allowed) {
      return textResult(
        `Message blocked by outbound filter: ${filterResult.reason}`,
        true
      );
    }

    const finalContent = filterResult.sanitized ?? content;

    try {
      const requestId = randomUUID();
      this.cloudClient.send({
        type: 'send_message',
        to,
        content: finalContent,
        metadata: { urgent },
        requestId,
      });

      // Audit log
      this._writeAuditLog(to, finalContent, tier, !!filterResult.sanitized);

      let warning = '';
      if (filterResult.reason) {
        warning = `\n${filterResult.reason}`;
      }
      if (filterResult.sanitized) {
        warning += '\nNote: message was sanitized before sending.';
      }

      return textResult(`Message sent to ${to}.${warning}`);
    } catch (err) {
      return textResult(
        `Failed to send message: ${err instanceof Error ? err.message : String(err)}`,
        true
      );
    }
  }

  private _writeAuditLog(
    to: string,
    content: string,
    tier: Tier,
    filtered: boolean
  ): void {
    if (!this.auditLog) return;
    try {
      const entry = JSON.stringify({
        timestamp: new Date().toISOString(),
        to,
        contentPreview: content.slice(0, 100),
        tier,
        filtered,
      });
      appendFileSync(AUDIT_LOG_PATH, entry + '\n');
    } catch {
      // Non-critical — don't let audit log failure block messaging
    }
  }

  private async checkMessages(
    params: Record<string, unknown>
  ): Promise<McpToolResult> {
    const limit = params.limit as number | undefined;
    const from = params.from as string | undefined;

    const messages = this.messageQueue.drain(limit, from);

    if (messages.length === 0) {
      return textResult('No new messages.');
    }

    const formatted = messages.map(formatMessageForDisplay).join('\n---\n');
    return textResult(formatted);
  }

  private async waitForMessage(
    params: Record<string, unknown>
  ): Promise<McpToolResult> {
    const timeoutSeconds = (params.timeout_seconds as number) ?? 30;
    const from = params.from as string | undefined;
    const timeoutMs = timeoutSeconds * 1000;

    const message = await this.messageQueue.waitForNext(timeoutMs, from);

    if (!message) {
      return textResult(`No message received within ${timeoutSeconds}s. Try check_messages to see pending messages, or list_agents to check if the sender is online.`);
    }

    return textResult(formatMessageForDisplay(message));
  }

  private async listAgents(
    params: Record<string, unknown>
  ): Promise<McpToolResult> {
    const onlineOnly = params.online_only as boolean | undefined;

    try {
      const requestId = randomUUID();

      // Send request and wait for response via promise
      const responsePromise = new Promise<McpToolResult>((resolve) => {
        const timeout = setTimeout(() => {
          this.cloudClient.removeListener('message', handler);
          resolve(textResult('Timeout waiting for agent list.', true));
        }, 10_000);

        const handler = (msg: { type: string; requestId?: string; agents?: Array<{ agentId: string; displayName: string; handle: string; status: string }> }) => {
          if (msg.type === 'agent_list' && msg.requestId === requestId) {
            clearTimeout(timeout);
            this.cloudClient.removeListener('message', handler);

            const agents = msg.agents ?? [];
            if (agents.length === 0) {
              resolve(textResult('No agents found.'));
            } else {
              const lines = agents.map(
                (a) => `${a.handle} (${a.displayName}) - ${a.status}`
              );
              resolve(textResult(lines.join('\n')));
            }
          }
        };

        this.cloudClient.on('message', handler);
      });

      this.cloudClient.send({
        type: 'list_agents',
        onlineOnly,
        requestId,
      });

      return await responsePromise;
    } catch (err) {
      return textResult(
        `Failed to list agents: ${err instanceof Error ? err.message : String(err)}`,
        true
      );
    }
  }

  private async addContact(
    params: Record<string, unknown>
  ): Promise<McpToolResult> {
    const agentId = params.agent_id as string;
    const tier = params.tier as 'friend' | 'stranger' | undefined;
    const alias = params.alias as string | undefined;

    if (!agentId) {
      return textResult('Missing required parameter: agent_id', true);
    }

    this.contactDB.upsertContact({
      agentId,
      tier: tier ?? 'friend',
      alias,
    });

    return textResult(
      `Contact ${agentId} added/updated as ${tier ?? 'friend'}.`
    );
  }

  private async getDigest(): Promise<McpToolResult> {
    const entries = this.messageRouter.clearDigest();
    if (entries.length === 0) {
      return textResult('No digest entries.');
    }

    const lines = entries.map(
      (e) => `[${e.timestamp}] ${e.from}: ${e.content}`
    );
    return textResult(lines.join('\n'));
  }

  private async myStatus(
    params: Record<string, unknown>
  ): Promise<McpToolResult> {
    const status = params.status as AgentStatus | undefined;

    if (status) {
      try {
        this.cloudClient.send({
          type: 'status_update',
          status,
        });
        return textResult(`Status updated to: ${status}`);
      } catch (err) {
        return textResult(
          `Failed to update status: ${err instanceof Error ? err.message : String(err)}`,
          true
        );
      }
    }

    return textResult(
      `Connected: ${this.cloudClient.connected}\nAgent ID: ${this.agentId}`
    );
  }
}

function formatMessageForDisplay(msg: Message): string {
  const parts = [
    `From: ${msg.from}`,
    `Time: ${msg.timestamp}`,
  ];
  if (msg.metadata.urgent) parts.push('Priority: URGENT');
  if (msg.metadata.replyTo) parts.push(`Reply to: ${msg.metadata.replyTo}`);
  parts.push(`\n${msg.content}`);
  return parts.join('\n');
}
