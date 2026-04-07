import type { Message, Tier, DigestEntry } from '@claw-im/shared';
import { resolveZone } from '@claw-im/shared';
import type { ContactDB } from './contact-db.js';
import type { MessageQueue } from './message-queue.js';
import type { HookServer } from './hook-server.js';

export class MessageRouter {
  private contactDB: ContactDB;
  private messageQueue: MessageQueue;
  private hookServer: HookServer;
  private digestAccumulator: DigestEntry[] = [];

  constructor(
    contactDB: ContactDB,
    messageQueue: MessageQueue,
    hookServer: HookServer
  ) {
    this.contactDB = contactDB;
    this.messageQueue = messageQueue;
    this.hookServer = hookServer;
  }

  routeMessage(message: Message): void {
    const contact = this.contactDB.getContact(message.from);

    // If blocked, silently drop
    if (contact?.blocked) {
      console.log(`[router] Dropped message from blocked contact ${message.from}`);
      return;
    }

    const tier: Tier = contact?.tier ?? 'stranger';
    const zone = resolveZone(
      tier,
      message.metadata.urgent,
      message.metadata.replyToSelf
    );

    console.log(
      `[router] Message from=${message.from} tier=${tier} zone=${zone}`
    );

    // Update last message time
    this.contactDB.upsertContact({
      agentId: message.from,
      lastMessageAt: message.timestamp,
    });

    switch (zone) {
      case 'interrupt':
        this.hookServer.addPendingInterrupt(message);
        break;

      case 'mailbox':
        this.messageQueue.enqueue(message);
        break;

      case 'digest':
        this.digestAccumulator.push({
          from: message.from,
          content: message.content,
          timestamp: message.timestamp,
        });
        console.log(
          `[router] Digest accumulated: ${this.digestAccumulator.length} entries`
        );
        break;
    }
  }

  getDigest(): DigestEntry[] {
    return [...this.digestAccumulator];
  }

  clearDigest(): DigestEntry[] {
    const entries = this.digestAccumulator;
    this.digestAccumulator = [];
    return entries;
  }
}
