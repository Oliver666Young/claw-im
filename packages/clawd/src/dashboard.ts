export const DASHBOARD_HTML = `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>Claw IM Dashboard</title>
<style>
  * { margin: 0; padding: 0; box-sizing: border-box; }
  body {
    background: #1a1a2e;
    color: #e0e0e0;
    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
    min-height: 100vh;
  }

  /* Header */
  .header {
    background: #16213e;
    padding: 12px 24px;
    display: flex;
    align-items: center;
    justify-content: space-between;
    border-bottom: 1px solid #0f3460;
  }
  .header-left {
    display: flex;
    align-items: center;
    gap: 12px;
  }
  .header-logo {
    font-size: 20px;
    font-weight: 700;
    color: #e94560;
  }
  .header-agent {
    font-size: 16px;
    color: #a0a0c0;
  }
  .header-agent .handle {
    color: #e0e0e0;
    font-weight: 600;
  }
  .status-dot {
    display: inline-block;
    width: 10px;
    height: 10px;
    border-radius: 50%;
    margin-right: 6px;
  }
  .status-dot.online { background: #4caf50; box-shadow: 0 0 6px #4caf50; }
  .status-dot.offline { background: #666; }
  .header-right {
    font-size: 13px;
    color: #888;
  }

  /* Layout */
  .main-layout {
    display: flex;
    height: calc(100vh - 49px);
  }

  /* Sidebar */
  .sidebar {
    width: 30%;
    min-width: 260px;
    max-width: 400px;
    background: #16213e;
    border-right: 1px solid #0f3460;
    display: flex;
    flex-direction: column;
    overflow: hidden;
  }
  .sidebar-title {
    padding: 14px 16px 10px;
    font-size: 13px;
    font-weight: 600;
    color: #888;
    text-transform: uppercase;
    letter-spacing: 0.5px;
    border-bottom: 1px solid #0f3460;
  }
  .contact-list {
    flex: 1;
    overflow-y: auto;
  }
  .contact-item {
    display: flex;
    align-items: center;
    padding: 10px 16px;
    border-bottom: 1px solid rgba(15,52,96,0.5);
    transition: background 0.15s;
  }
  .contact-item:hover {
    background: rgba(15,52,96,0.6);
  }
  .contact-dot {
    width: 8px;
    height: 8px;
    border-radius: 50%;
    margin-right: 10px;
    flex-shrink: 0;
  }
  .contact-dot.online { background: #4caf50; }
  .contact-dot.offline { background: #444; }
  .contact-info {
    flex: 1;
    min-width: 0;
  }
  .contact-name {
    font-size: 14px;
    font-weight: 500;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }
  .contact-handle {
    font-size: 12px;
    color: #888;
  }
  .contact-meta {
    display: flex;
    flex-direction: column;
    align-items: flex-end;
    gap: 4px;
    flex-shrink: 0;
    margin-left: 8px;
  }
  .contact-time {
    font-size: 11px;
    color: #666;
  }
  .tier-badge {
    font-size: 10px;
    padding: 1px 6px;
    border-radius: 8px;
    font-weight: 600;
    text-transform: uppercase;
  }
  .tier-badge.friend { background: #0f3460; color: #64b5f6; }
  .tier-badge.stranger { background: #3e1616; color: #e94560; }
  .tier-badge.self { background: #1e3a1e; color: #81c784; }
  .unread-badge {
    background: #e94560;
    color: #fff;
    font-size: 11px;
    font-weight: 700;
    min-width: 18px;
    height: 18px;
    border-radius: 9px;
    display: flex;
    align-items: center;
    justify-content: center;
    padding: 0 5px;
  }

  /* Content */
  .content {
    flex: 1;
    overflow-y: auto;
    padding: 20px;
    display: flex;
    flex-direction: column;
    gap: 20px;
  }

  /* Stats cards */
  .stats-row {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(180px, 1fr));
    gap: 14px;
  }
  .stat-card {
    background: #16213e;
    border-radius: 10px;
    padding: 16px 20px;
    box-shadow: 0 2px 8px rgba(0,0,0,0.3);
    transition: transform 0.15s;
  }
  .stat-card:hover {
    transform: translateY(-2px);
  }
  .stat-label {
    font-size: 12px;
    color: #888;
    text-transform: uppercase;
    letter-spacing: 0.5px;
    margin-bottom: 6px;
  }
  .stat-value {
    font-size: 28px;
    font-weight: 700;
    color: #e0e0e0;
  }
  .stat-sub {
    font-size: 12px;
    color: #666;
    margin-top: 2px;
  }

  /* Messages section */
  .section-title {
    font-size: 14px;
    font-weight: 600;
    color: #888;
    text-transform: uppercase;
    letter-spacing: 0.5px;
    margin-bottom: 8px;
  }
  .messages-feed {
    background: #16213e;
    border-radius: 10px;
    padding: 16px;
    box-shadow: 0 2px 8px rgba(0,0,0,0.3);
    max-height: 420px;
    overflow-y: auto;
  }
  .message-item {
    display: flex;
    margin-bottom: 10px;
    gap: 10px;
  }
  .message-item.inbound {
    justify-content: flex-start;
  }
  .message-item.outbound {
    justify-content: flex-end;
  }
  .message-bubble {
    max-width: 70%;
    padding: 10px 14px;
    border-radius: 12px;
    position: relative;
  }
  .message-item.inbound .message-bubble {
    background: #0f3460;
    border-bottom-left-radius: 4px;
  }
  .message-item.outbound .message-bubble {
    background: #1b5e20;
    border-bottom-right-radius: 4px;
  }
  .message-bubble.urgent {
    border: 1px solid #e94560;
    box-shadow: 0 0 8px rgba(233,69,96,0.3);
  }
  .message-sender {
    font-size: 11px;
    font-weight: 600;
    color: #64b5f6;
    margin-bottom: 3px;
  }
  .message-item.outbound .message-sender {
    color: #81c784;
    text-align: right;
  }
  .message-content {
    font-size: 13px;
    font-family: 'SF Mono', 'Fira Code', 'Cascadia Code', monospace;
    line-height: 1.4;
    word-break: break-word;
  }
  .message-time {
    font-size: 10px;
    color: #666;
    margin-top: 4px;
  }
  .message-item.outbound .message-time {
    text-align: right;
  }
  .empty-state {
    text-align: center;
    color: #555;
    padding: 30px;
    font-size: 14px;
  }

  /* Sessions */
  .sessions-list {
    background: #16213e;
    border-radius: 10px;
    padding: 16px;
    box-shadow: 0 2px 8px rgba(0,0,0,0.3);
  }
  .session-item {
    display: flex;
    align-items: center;
    padding: 8px 0;
    border-bottom: 1px solid rgba(15,52,96,0.5);
    gap: 10px;
  }
  .session-item:last-child {
    border-bottom: none;
  }
  .session-icon {
    color: #e94560;
    font-size: 16px;
    flex-shrink: 0;
  }
  .session-info {
    flex: 1;
    min-width: 0;
  }
  .session-id {
    font-size: 13px;
    font-family: monospace;
    color: #a0a0c0;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }
  .session-cwd {
    font-size: 11px;
    color: #666;
    font-family: monospace;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }
  .session-activity {
    font-size: 11px;
    color: #666;
    flex-shrink: 0;
  }

  /* Scrollbar */
  ::-webkit-scrollbar { width: 6px; }
  ::-webkit-scrollbar-track { background: transparent; }
  ::-webkit-scrollbar-thumb { background: #333; border-radius: 3px; }
  ::-webkit-scrollbar-thumb:hover { background: #555; }

  /* Responsive */
  @media (max-width: 768px) {
    .main-layout { flex-direction: column; }
    .sidebar {
      width: 100%;
      max-width: none;
      max-height: 40vh;
    }
    .stats-row { grid-template-columns: repeat(2, 1fr); }
  }
</style>
</head>
<body>

<div class="header">
  <div class="header-left">
    <div class="header-logo">Claw IM</div>
    <div class="header-agent">
      <span class="status-dot" id="statusDot"></span>
      <span class="handle" id="agentHandle">--</span>
    </div>
  </div>
  <div class="header-right" id="uptime">--</div>
</div>

<div class="main-layout">
  <div class="sidebar">
    <div class="sidebar-title">Contacts</div>
    <div class="contact-list" id="contactList">
      <div class="empty-state">Loading...</div>
    </div>
  </div>

  <div class="content">
    <div class="stats-row">
      <div class="stat-card">
        <div class="stat-label">Unread</div>
        <div class="stat-value" id="statUnread">--</div>
      </div>
      <div class="stat-card">
        <div class="stat-label">Contacts</div>
        <div class="stat-value" id="statContacts">--</div>
        <div class="stat-sub" id="statContactsSub"></div>
      </div>
      <div class="stat-card">
        <div class="stat-label">Messages Today</div>
        <div class="stat-value" id="statMessages">--</div>
        <div class="stat-sub" id="statMessagesSub"></div>
      </div>
      <div class="stat-card">
        <div class="stat-label">Sessions</div>
        <div class="stat-value" id="statSessions">--</div>
      </div>
    </div>

    <div>
      <div class="section-title">Recent Messages</div>
      <div class="messages-feed" id="messagesFeed">
        <div class="empty-state">No messages yet</div>
      </div>
    </div>

    <div>
      <div class="section-title">Active Sessions</div>
      <div class="sessions-list" id="sessionsList">
        <div class="empty-state">No active sessions</div>
      </div>
    </div>
  </div>
</div>

<script>
(function() {
  var startTime = Date.now();
  var lastData = null;

  function relativeTime(ts) {
    if (!ts) return '';
    var now = Date.now();
    var t = typeof ts === 'number' ? ts : new Date(ts).getTime();
    var diff = Math.floor((now - t) / 1000);
    if (diff < 0) diff = 0;
    if (diff < 10) return 'just now';
    if (diff < 60) return diff + 's ago';
    if (diff < 3600) return Math.floor(diff / 60) + 'm ago';
    if (diff < 86400) return Math.floor(diff / 3600) + 'h ago';
    return Math.floor(diff / 86400) + 'd ago';
  }

  function escapeHtml(s) {
    var d = document.createElement('div');
    d.textContent = s;
    return d.innerHTML;
  }

  function truncate(s, n) {
    if (!s) return '';
    return s.length > n ? s.slice(0, n) + '...' : s;
  }

  function formatUptime() {
    var diff = Math.floor((Date.now() - startTime) / 1000);
    var h = Math.floor(diff / 3600);
    var m = Math.floor((diff % 3600) / 60);
    var s = diff % 60;
    var parts = [];
    if (h > 0) parts.push(h + 'h');
    parts.push(m + 'm');
    parts.push(s + 's');
    return 'Dashboard uptime: ' + parts.join(' ');
  }

  function renderContacts(contacts) {
    var el = document.getElementById('contactList');
    if (!contacts || contacts.length === 0) {
      el.innerHTML = '<div class="empty-state">No contacts</div>';
      return;
    }
    var html = '';
    for (var i = 0; i < contacts.length; i++) {
      var c = contacts[i];
      var dotClass = c.online ? 'online' : 'offline';
      html += '<div class="contact-item">';
      html += '<div class="contact-dot ' + dotClass + '"></div>';
      html += '<div class="contact-info">';
      html += '<div class="contact-name">' + escapeHtml(c.displayName || c.agentId) + '</div>';
      html += '<div class="contact-handle">' + escapeHtml(c.handle || c.agentId) + '</div>';
      html += '</div>';
      html += '<div class="contact-meta">';
      if (c.unreadCount > 0) {
        html += '<div class="unread-badge">' + c.unreadCount + '</div>';
      }
      html += '<div class="tier-badge ' + escapeHtml(c.tier) + '">' + escapeHtml(c.tier) + '</div>';
      if (c.lastMessageAt) {
        html += '<div class="contact-time">' + relativeTime(c.lastMessageAt) + '</div>';
      }
      html += '</div>';
      html += '</div>';
    }
    el.innerHTML = html;
  }

  function renderMessages(messages) {
    var el = document.getElementById('messagesFeed');
    if (!messages || messages.length === 0) {
      el.innerHTML = '<div class="empty-state">No messages yet</div>';
      return;
    }
    var html = '';
    var display = messages.slice(-50);
    for (var i = 0; i < display.length; i++) {
      var m = display[i];
      var dir = m.direction === 'outbound' ? 'outbound' : 'inbound';
      var urgentClass = m.urgent ? ' urgent' : '';
      html += '<div class="message-item ' + dir + '">';
      html += '<div class="message-bubble' + urgentClass + '">';
      html += '<div class="message-sender">';
      if (dir === 'inbound') {
        html += escapeHtml(m.from) + ' \\u2192';
      } else {
        html += '\\u2192 ' + escapeHtml(m.to);
      }
      html += '</div>';
      html += '<div class="message-content">' + escapeHtml(truncate(m.content, 200)) + '</div>';
      html += '<div class="message-time">' + relativeTime(m.timestamp) + '</div>';
      html += '</div>';
      html += '</div>';
    }
    el.innerHTML = html;
    el.scrollTop = el.scrollHeight;
  }

  function renderSessions(sessions) {
    var el = document.getElementById('sessionsList');
    if (!sessions || sessions.length === 0) {
      el.innerHTML = '<div class="empty-state">No active sessions</div>';
      return;
    }
    var html = '';
    for (var i = 0; i < sessions.length; i++) {
      var s = sessions[i];
      html += '<div class="session-item">';
      html += '<div class="session-icon">&#9654;</div>';
      html += '<div class="session-info">';
      html += '<div class="session-id">' + escapeHtml(s.sessionId) + '</div>';
      html += '<div class="session-cwd">' + escapeHtml(s.cwd) + '</div>';
      html += '</div>';
      html += '<div class="session-activity">' + relativeTime(s.lastActivity) + '</div>';
      html += '</div>';
    }
    el.innerHTML = html;
  }

  function update(data) {
    lastData = data;

    // Header
    var dot = document.getElementById('statusDot');
    var handle = document.getElementById('agentHandle');
    if (data.agent) {
      handle.textContent = '@' + (data.agent.handle || data.agent.agentId);
      dot.className = 'status-dot ' + (data.agent.status === 'online' ? 'online' : 'offline');
    }

    // Uptime
    document.getElementById('uptime').textContent = formatUptime();

    // Stats
    var stats = data.stats || {};
    document.getElementById('statUnread').textContent = stats.unread != null ? stats.unread : 0;
    document.getElementById('statContacts').textContent = stats.totalContacts != null ? stats.totalContacts : 0;
    document.getElementById('statContactsSub').textContent = (stats.onlineContacts || 0) + ' online';
    document.getElementById('statMessages').textContent = ((stats.messagesSentToday || 0) + (stats.messagesReceivedToday || 0));
    document.getElementById('statMessagesSub').textContent = (stats.messagesSentToday || 0) + ' sent / ' + (stats.messagesReceivedToday || 0) + ' received';
    document.getElementById('statSessions').textContent = (data.activeSessions || []).length;

    // Contacts
    renderContacts(data.contacts);

    // Messages
    renderMessages(data.recentMessages);

    // Sessions
    renderSessions(data.activeSessions);
  }

  function fetchData() {
    fetch('/api/dashboard')
      .then(function(r) { return r.json(); })
      .then(function(data) { update(data); })
      .catch(function(e) { console.error('Dashboard fetch error:', e); });
  }

  // Also update uptime every second
  setInterval(function() {
    if (lastData) {
      document.getElementById('uptime').textContent = formatUptime();
    }
  }, 1000);

  fetchData();
  setInterval(fetchData, 3000);
})();
</script>
</body>
</html>`;
