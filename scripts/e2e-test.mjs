import WebSocket from 'ws';

const CLOUD = 'wss://claw-im-production.up.railway.app/ws';
const ID1 = '65950b79-ed37-47aa-adff-9f5d7350eceb';
const KEY1 = 'a38c94322d5a2652d630fa3e1d0c60b8b38b7a5452c6baf1';
const ID2 = 'b8b7a9c0-709f-45c5-b245-e84159ec31ce';
const KEY2 = '02529876eaf58abc7c99d5e04a725f4c68f787075091223f';

function connectAgent(id, key, name) {
  return new Promise((resolve, reject) => {
    const ws = new WebSocket(CLOUD);
    const received = [];
    ws.on('open', () => {
      ws.send(JSON.stringify({ type: 'auth', agentId: id, apiKey: key }));
    });
    ws.on('message', (data) => {
      const msg = JSON.parse(data.toString());
      if (msg.type === 'auth_ok') {
        console.log(`[${name}] Authenticated as ${msg.agent.handle}`);
        resolve({ ws, received, send: (m) => ws.send(JSON.stringify(m)) });
      } else if (msg.type === 'auth_error') {
        reject(new Error(`Auth failed for ${name}: ${msg.reason}`));
      } else {
        console.log(`[${name}] Received: ${msg.type}`, msg.type === 'new_message' ? `from=${msg.message.from} content="${msg.message.content}"` : msg.type === 'message_ack' ? `status=${msg.status}` : '');
        received.push(msg);
      }
    });
    ws.on('error', (e) => reject(e));
    setTimeout(() => reject(new Error(`${name} auth timeout`)), 10000);
  });
}

async function main() {
  console.log('=== E2E Test: Bidirectional Messaging ===\n');

  console.log('Step 1: Connecting both agents...');
  const agent1 = await connectAgent(ID1, KEY1, 'testbot1');
  const agent2 = await connectAgent(ID2, KEY2, 'testbot2');
  console.log('Both agents connected.\n');

  await new Promise(r => setTimeout(r, 1000));

  // Test 1: testbot1 → testbot2 (using handle)
  console.log('Step 2: testbot1 → testbot2 "Hello from bot1"');
  agent1.send({ type: 'send_message', to: 'testbot2', content: 'Hello from bot1', requestId: 'req-1' });
  await new Promise(r => setTimeout(r, 3000));

  const bot2Msgs = agent2.received.filter(m => m.type === 'new_message');
  const ack1 = agent1.received.find(m => m.type === 'message_ack' && m.requestId === 'req-1');
  console.log(bot2Msgs.length > 0
    ? `✅ testbot2 received: "${bot2Msgs[0].message.content}" from=${bot2Msgs[0].message.from}`
    : '❌ testbot2 did NOT receive');
  console.log(ack1 ? `✅ ack: ${ack1.status}` : '❌ no ack');

  // Test 2: testbot2 → testbot1 (reply)
  console.log('\nStep 3: testbot2 → testbot1 "Reply from bot2"');
  agent2.send({ type: 'send_message', to: 'testbot1', content: 'Reply from bot2', requestId: 'req-2' });
  await new Promise(r => setTimeout(r, 3000));

  const bot1Msgs = agent1.received.filter(m => m.type === 'new_message');
  const ack2 = agent2.received.find(m => m.type === 'message_ack' && m.requestId === 'req-2');
  console.log(bot1Msgs.length > 0
    ? `✅ testbot1 received: "${bot1Msgs[0].message.content}" from=${bot1Msgs[0].message.from}`
    : '❌ testbot1 did NOT receive');
  console.log(ack2 ? `✅ ack: ${ack2.status}` : '❌ no ack');

  console.log('\n=== RESULT ===');
  const pass = bot2Msgs.length > 0 && bot1Msgs.length > 0;
  console.log(pass ? '🎉 ALL PASSED' : '💀 FAILED');

  agent1.ws.close();
  agent2.ws.close();
  process.exit(pass ? 0 : 1);
}

main().catch(e => { console.error('Fatal:', e); process.exit(1); });
