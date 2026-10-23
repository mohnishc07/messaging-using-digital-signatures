(function () {
  'use strict';
  const { ApiError, createApi, reconcileConversation } = window.SignedChat;
  const api = createApi();
  const names = ['Alice', 'Bob'];
  const state = { users: [], messages: [], connected: false, busy: false };
  const panels = new Map();
  const grid = document.querySelector('#chat-grid');
  const refreshButton = document.querySelector('#refresh');
  const status = document.querySelector('#connection-status');
  const connectionError = document.querySelector('#connection-error');
  const paths = {
    shield: '<path d="M12 3 4 6v6c0 5 8 9 8 9s8-4 8-9V6z"/><path d="m8 12 3 3 5-6"/>',
    chat: '<path d="M21 11a8 8 0 0 1-8 8H5l-3 3V11a9 9 0 0 1 19 0Z"/>',
    refresh: '<path d="M20 7v5h-5M4 17v-5h5"/><path d="M6 7a7 7 0 0 1 12-2l2 2M18 17a7 7 0 0 1-12 2l-2-2"/>',
    key: '<circle cx="15" cy="8" r="5"/><path d="m11 12-8 8v2h4v-3h3v-3l3-3"/>',
    send: '<path d="m22 2-7 20-4-9-9-4 20-7ZM11 13 22 2"/>'
  };
  function icon(name) {
    const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
    for (const [key, value] of Object.entries({ viewBox: '0 0 24 24', width: '18', height: '18', fill: 'none', stroke: 'currentColor', 'stroke-width': '1.6', 'stroke-linecap': 'round', 'stroke-linejoin': 'round', 'aria-hidden': 'true' })) svg.setAttribute(key, value);
    // Only hard-coded SVG paths are inserted; message/user data always uses textContent.
    svg.innerHTML = paths[name];
    return svg;
  }
  function element(tag, className, text) {
    const node = document.createElement(tag);
    if (className) node.className = className;
    if (text !== undefined) node.textContent = text;
    return node;
  }
  function notice(panel, kind, text) {
    const node = panel.querySelector('.notice');
    node.className = `notice ${kind}`; node.textContent = text; node.hidden = !text;
  }
  function renderControls() {
    refreshButton.disabled = state.busy;
    for (const [name, entry] of panels) {
      const user = state.users.find(user => user.name === name);
      entry.panel.querySelector('textarea').disabled = !state.connected || !user || entry.sending;
      entry.panel.querySelector('.send-button').disabled = !state.connected || !user || state.busy || entry.sending || !entry.textarea.value.trim();
      const create = entry.panel.querySelector('.create-button');
      if (create) create.disabled = !state.connected || state.busy || entry.creating;
      entry.panel.querySelector('.presence').classList.toggle('online', state.connected && Boolean(user));
    }
  }
  function renderMessage(message, name) {
    const node = element('article', `message ${message.senderId === name ? 'outgoing' : 'incoming'}`);
    node.append(element('div', 'message-sender', message.senderId === name ? 'You' : message.senderId), element('p', '', message.message));
    const accepted = element('div', 'verified', 'Accepted by backend'); accepted.prepend(icon('shield')); node.append(accepted);
    const details = element('details', 'message-details');
    details.append(element('summary', '', 'Inspect signature ⌄'));
    const content = element('div', 'detail-content');
    const list = element('dl');
    for (const [label, value] of [['Sender', message.senderId], ['Recipient', message.receiverId], ['Signature · Base64', message.signature]]) {
      list.append(element('dt', '', label), element('dd', label.startsWith('Signature') ? 'signature' : '', value));
    }
    const copy = element('button', 'text-button', 'Copy signed message'); copy.type = 'button';
    copy.addEventListener('click', async () => {
      try { await navigator.clipboard.writeText(JSON.stringify(message, null, 2)); copy.textContent = 'Copied JSON'; }
      catch { copy.textContent = 'Copy unavailable. Select the signature manually.'; }
    });
    content.append(list, copy); details.append(content); node.append(details); return node;
  }
  function renderPanels() {
    for (const [name, entry] of panels) {
      const user = state.users.find(user => user.name === name);
      const peer = name === 'Alice' ? 'Bob' : 'Alice';
      entry.panel.querySelector('.peer-label').textContent = user ? `Chatting with ${peer}` : 'Create user to start';
      entry.panel.querySelector('.trust-label').textContent = user ? (user.trusted ? 'Key registered as trusted' : 'Key is not trusted') : 'No signing key registered';
      const key = entry.panel.querySelector('.public-key'); key.hidden = !user;
      key.querySelector('code').textContent = user?.publicKey || '';
      const messages = state.messages.filter(m => (m.senderId === name && m.receiverId === peer) || (m.senderId === peer && m.receiverId === name));
      const log = entry.panel.querySelector('.messages');
      // Avoid replacing open details or changing scroll position on an unchanged refresh.
      const version = JSON.stringify([Boolean(user), messages]);
      if (version === entry.version) continue;
      entry.version = version; log.replaceChildren();
      if (user && messages.length) for (const message of messages) log.append(renderMessage(message, name));
      else {
        const empty = element('div', 'empty-state'); const mark = element('span', 'empty-icon'); mark.append(icon(user ? 'chat' : 'key'));
        empty.append(mark, element('h3', '', user ? 'A conversation starts here.' : `Meet ${name}.`), element('p', '', user ? `Send a message to ${peer}. The backend signs it and checks the signature before delivery.` : `Create ${name} and generate an Ed25519 signing key to begin.`));
        if (!user) { const create = element('button', 'button button-primary create-button', `Create ${name}`); create.type = 'button'; create.addEventListener('click', () => createUser(name)); empty.append(create); }
        log.append(empty);
      }
      log.scrollTop = log.scrollHeight;
    }
    renderControls();
  }
  async function refresh() {
    if (state.busy) return;
    state.busy = true; connectionError.hidden = true; renderControls();
    try {
      const users = await api.listUsers();
      const inboxes = await Promise.all(names.map(name => users.some(user => user.name === name) ? api.getInbox(name) : []));
      state.users = users; state.messages = reconcileConversation(state.messages, inboxes.flat()); state.connected = true;
      status.textContent = 'Backend connected'; status.className = 'connection-status connected'; renderPanels();
    } catch (error) {
      state.connected = false; status.textContent = 'Backend unavailable'; status.className = 'connection-status error';
      connectionError.textContent = `${error.message} Start the backend on port 8080, then refresh. Existing messages may be out of date.`; connectionError.hidden = false;
    } finally { state.busy = false; renderControls(); }
  }
  async function createUser(name) {
    const entry = panels.get(name); if (entry.creating) return;
    entry.creating = true; notice(entry.panel, '', ''); renderControls();
    try { try { await api.createUser({ name, trusted: true }); } catch (error) { if (!(error instanceof ApiError && error.status === 409)) throw error; } await refresh(); }
    catch (error) { notice(entry.panel, 'error', error.message); }
    finally { entry.creating = false; renderControls(); }
  }
  async function send(name) {
    const entry = panels.get(name); const content = entry.textarea.value;
    if (!content.trim() || entry.sending || state.busy || !state.connected || !state.users.some(user => user.name === name)) return;
    const peer = name === 'Alice' ? 'Bob' : 'Alice'; entry.sending = true; notice(entry.panel, '', ''); renderControls();
    try {
      const result = await api.send({ sender: name, recipient: peer, content });
      if (result.delivered) { entry.textarea.value = ''; await refresh(); notice(entry.panel, 'success', `Signed and delivered to ${peer}.`); }
      else notice(entry.panel, 'error', 'The backend rejected this message. It was not delivered.');
    } catch (error) { notice(entry.panel, 'error', error.message); }
    finally { entry.sending = false; renderControls(); }
  }
  names.forEach((name, index) => {
    const panel = document.querySelector('#panel-template').content.firstElementChild.cloneNode(true);
    panel.classList.add(name.toLowerCase()); panel.setAttribute('aria-label', `${name}'s conversation`);
    panel.querySelector('.initial').textContent = name[0]; panel.querySelector('h2').textContent = name;
    panel.querySelector('.identity-label').textContent = `USER 0${index + 1}`;
    panel.querySelector('.messages').setAttribute('aria-label', `${name}'s messages`);
    const peer = name === 'Alice' ? 'Bob' : 'Alice'; const textarea = panel.querySelector('textarea');
    textarea.id = `message-${name}`; textarea.placeholder = `Message ${peer}…`;
    const label = panel.querySelector('label'); label.htmlFor = textarea.id; label.textContent = `Message from ${name} to ${peer}`;
    panel.querySelector('.send-button').setAttribute('aria-label', `Send from ${name} to ${peer}`);
    textarea.addEventListener('input', renderControls);
    textarea.addEventListener('keydown', event => { if (event.key === 'Enter' && !event.shiftKey && !event.isComposing) { event.preventDefault(); void send(name); } });
    panel.querySelector('form').addEventListener('submit', event => { event.preventDefault(); void send(name); });
    panels.set(name, { panel, textarea, sending: false, creating: false }); grid.append(panel);
  });
  document.querySelectorAll('[data-icon]').forEach(node => node.replaceChildren(icon(node.dataset.icon)));
  document.querySelectorAll('[data-tab]').forEach(button => button.addEventListener('click', () => {
    grid.className = `chat-grid show-${button.dataset.tab.toLowerCase()}`;
    document.querySelectorAll('[data-tab]').forEach(tab => tab.setAttribute('aria-pressed', String(tab === button)));
  }));
  refreshButton.addEventListener('click', refresh); renderPanels(); void refresh();
})();
