(function () {
  'use strict';
  const {createApi, reconcileConversation} = window.SignedChat;
  const api = createApi();
  const state = {users: [], selected: ['', ''], messages: [], busy: false, connected: false};
  const panels = [], cache = new Map();
  const status = document.querySelector('#connection-status'), errorBox = document.querySelector('#connection-error');
  const selects = [document.querySelector('#select-left'), document.querySelector('#select-right')];
  const createButton = document.querySelector('#create-user');
  const dialog = document.querySelector('#keys-dialog');
  function el(tag, cls, text) { const node = document.createElement(tag); if (cls) node.className = cls; if (text !== undefined) node.textContent = text; return node; }
  function notice(node, kind, text) { node.className = 'notice ' + kind; node.textContent = text; node.hidden = !text; }
  function showView(view) {
    document.querySelectorAll('.dashboard-view').forEach(node => { node.hidden = node.id !== 'view-' + view; });
    document.querySelectorAll('[data-view]').forEach(button => { const active = button.dataset.view === view; button.classList.toggle('nav-current', active); button.setAttribute('aria-pressed', active); });
    document.querySelector('#section-label').textContent = view === 'math' ? 'SIGNING MATH' : view === 'users' ? 'USERS & KEYS' : 'CONVERSATIONS';
  }
  function controls() {
    document.querySelector('#refresh').disabled = state.busy;
    createButton.disabled = state.busy || !state.connected;
    selects.forEach(select => { select.disabled = state.busy || !state.connected; });
    panels.forEach((entry, i) => {
      const canSend = state.connected && !state.busy && state.selected[i] && state.selected[1-i] && state.selected[i] !== state.selected[1-i];
      entry.textarea.disabled = !canSend;
      entry.panel.querySelector('.send-button').disabled = !canSend || !entry.textarea.value.trim();
      entry.panel.querySelector('.presence').classList.toggle('online', Boolean(state.connected && state.selected[i]));
    });
  }
  function messageNode(message, name) {
    const node = el('article', 'message ' + (message.senderId === name ? 'outgoing' : 'incoming'));
    node.append(el('div', 'message-sender', message.senderId === name ? 'You' : message.senderId), el('p', '', message.message), el('div', 'verified', '✓ Accepted by backend'));
    const details = el('details', 'message-details'); details.append(el('summary', '', 'Inspect signature ⌄'));
    const content = el('div', 'detail-content'), list = el('dl');
    [['Sender', message.senderId], ['Recipient', message.receiverId], ['Signature · Base64', message.signature]].forEach(([label, value]) => list.append(el('dt', '', label), el('dd', label.startsWith('Signature') ? 'signature' : '', value)));
    const copy = el('button', 'text-button', 'Copy signed message'); copy.type = 'button';
    copy.addEventListener('click', async () => { try { await navigator.clipboard.writeText(JSON.stringify(message, null, 2)); copy.textContent = 'Copied JSON'; } catch { copy.textContent = 'Copy unavailable. Select the signature manually.'; } });
    const trace = el('button', 'text-button', 'Trace this payload in the math lab'); trace.type = 'button';
    trace.addEventListener('click', () => { document.querySelector('#math-sender').value = message.senderId; document.querySelector('#math-recipient').value = message.receiverId; document.querySelector('#math-message').value = message.message; showView('math'); document.querySelector('#run-math').focus(); });
    content.append(list, copy, trace); details.append(content); node.append(details); return node;
  }
  function render() {
    selects.forEach((select, i) => {
      select.replaceChildren(new Option('Choose a user', ''));
      state.users.forEach(user => { const option = new Option(user.name, user.name); option.disabled = user.name === state.selected[1-i]; select.add(option); });
      select.value = state.selected[i];
    });
    document.querySelectorAll('[data-tab]').forEach(button => { const i = Number(button.dataset.tab); button.textContent = state.selected[i] || (i ? 'Right user' : 'Left user'); });
    panels.forEach((entry, i) => {
      const name = state.selected[i], peer = state.selected[1-i], user = state.users.find(u => u.name === name);
      entry.panel.setAttribute('aria-label', (name || (i ? 'Right user' : 'Left user')) + "'s conversation");
      entry.panel.querySelector('h2').textContent = name || 'Choose a user'; entry.panel.querySelector('.initial').textContent = name ? Array.from(name)[0] : '?';
      entry.panel.querySelector('.peer-label').textContent = peer ? 'Chatting with ' + peer : 'Choose a recipient';
      entry.panel.querySelector('.trust-label').textContent = user ? (user.trusted ? '✓ Key marked trusted by server' : 'Signing key is not trusted') : 'Create or choose a user to start';
      entry.textarea.placeholder = peer ? 'Message ' + peer + '…' : 'Choose a recipient…';
      entry.panel.querySelector('label').textContent = 'Message from ' + (name || 'left user') + ' to ' + (peer || 'right user');
      entry.panel.querySelector('.send-button').setAttribute('aria-label', 'Send from ' + (name || 'left user') + ' to ' + (peer || 'right user'));
      const messages = state.messages.filter(m => (m.senderId === name && m.receiverId === peer) || (m.senderId === peer && m.receiverId === name));
      const version = JSON.stringify([name, peer, messages]);
      if (version !== entry.version) {
        entry.version = version; entry.log.replaceChildren();
        if (messages.length) messages.forEach(message => entry.log.append(messageNode(message, name)));
        else { const empty = el('div', 'empty-state'); empty.append(el('span', 'empty-icon', '✉'), el('h3', '', name && peer ? 'A conversation starts here.' : 'Pick your people.'), el('p', '', name && peer ? 'Send a message. The backend signs it and verifies it before delivery.' : 'Create users in Users & keys, then choose them above.')); const button = el('button', 'button button-outline', 'Create a user'); button.addEventListener('click', () => showView('users')); empty.append(button); entry.log.append(empty); }
        entry.log.scrollTop = entry.log.scrollHeight;
      }
    });
    const directory = document.querySelector('#user-directory'); directory.replaceChildren();
    document.querySelector('#user-count').textContent = state.users.length + ' users';
    if (!state.users.length) directory.append(el('p', '', 'No users yet. Create the first user above.'));
    state.users.forEach(user => {
      const card = el('article', 'surface user-card'); card.append(el('h3', '', user.name), el('p', '', user.trusted ? 'Ed25519 · Server-trusted key' : 'Ed25519 · Untrusted key'));
      const buttons = el('div', 'form-row'); [0,1].forEach(i => { const button = el('button', 'button button-outline', i ? 'Use on right' : 'Use on left'); button.disabled = state.busy; button.addEventListener('click', async () => { if (state.selected[1-i] === user.name) state.selected[1-i] = ''; state.selected[i] = user.name; panels[i].textarea.value = ''; showView('messages'); await refresh(); }); buttons.append(button); }); card.append(buttons); directory.append(card);
    });
    controls();
  }
  async function fetchState() {
    const users = (await api.listUsers()).sort((a,b) => a.name.localeCompare(b.name));
    state.selected = state.selected.map(name => users.some(u => u.name === name) ? name : '');
    if (!state.selected[0]) state.selected[0] = users.find(u => u.name !== state.selected[1])?.name || '';
    if (!state.selected[1]) state.selected[1] = users.find(u => u.name !== state.selected[0])?.name || '';
    const inboxes = await Promise.all(state.selected.map(name => name ? api.getInbox(name) : []));
    const key = JSON.stringify([...state.selected].sort());
    state.messages = reconcileConversation(cache.get(key) || [], inboxes.flat()); cache.set(key, state.messages);
    state.users = users; state.connected = true; status.textContent = 'Backend connected'; status.className = 'connection-status connected';
  }
  async function refresh() {
    if (state.busy) return; state.busy = true; errorBox.hidden = true; controls();
    try { await fetchState(); render(); }
    catch (error) { state.connected = false; status.textContent = 'Backend unavailable'; status.className = 'connection-status error'; errorBox.textContent = error.message + ' Check the backend, then refresh.'; errorBox.hidden = false; }
    finally { state.busy = false; render(); }
  }
  function clearKeys() {
    document.querySelector('#created-private-key').value = ''; document.querySelector('#created-public-key').value = '';
    document.querySelector('#keys-owner').textContent = ''; document.querySelector('#key-copy-status').textContent = '';
  }
  dialog.addEventListener('close', () => { clearKeys(); notice(document.querySelector('#create-notice'), 'success', 'Keys hidden. Keep your saved private key secret; it cannot be displayed again.'); });
  document.querySelector('#hide-keys').addEventListener('click', () => { clearKeys(); dialog.close(); });
  document.querySelector('#copy-keys').addEventListener('click', async () => {
    try { await navigator.clipboard.writeText('Public key (X.509 Base64):\n' + document.querySelector('#created-public-key').value + '\nPrivate key (PKCS#8 Base64) — KEEP SECRET:\n' + document.querySelector('#created-private-key').value); document.querySelector('#key-copy-status').textContent = 'Copied. Store the private key securely.'; }
    catch { document.querySelector('#key-copy-status').textContent = 'Copy unavailable. Select and save the keys manually.'; }
  });
  document.querySelector('#create-user-form').addEventListener('submit', async event => {
    event.preventDefault(); if (state.busy || !state.connected) return;
    const input = document.querySelector('#new-user-name'), name = input.value.trim(), note = document.querySelector('#create-notice');
    if (!name) { notice(note, 'error', 'Enter a user name.'); return; }
    state.busy = true; controls(); notice(note, '', '');
    try {
      let created = await api.createUser({name, trusted:true});
      document.querySelector('#keys-owner').textContent = 'Keys for ' + created.name;
      document.querySelector('#created-public-key').value = created.publicKey;
      document.querySelector('#created-private-key').value = created.privateKey || '';
      const hasSecret = Boolean(created.privateKey); created = null; // Never put creation responses in the shared user list or browser storage.
      if (hasSecret) dialog.showModal();
      input.value = ''; notice(note, hasSecret ? 'success' : 'error', hasSecret ? name + ' created. Save the keys from the dialog.' : 'User created, but this backend version does not return a one-time private key. Update the backend.');
      try { await fetchState(); } catch (error) { errorBox.textContent = 'User created, but refreshing failed: ' + error.message; errorBox.hidden = false; }
    } catch (error) { notice(note, 'error', error.message); }
    finally { state.busy = false; render(); }
  });
  async function send(i) {
    const entry = panels[i], content = entry.textarea.value, name = state.selected[i], peer = state.selected[1-i];
    if (state.busy || !state.connected || !name || !peer || name === peer || !content.trim()) return;
    state.busy = true; controls(); const note = entry.panel.querySelector('.notice'); notice(note, '', '');
    try {
      const result = await api.send({sender:name, recipient:peer, content});
      if (result.delivered) { entry.textarea.value = ''; notice(note, 'success', 'Signed and delivered to ' + peer + '.'); try { await fetchState(); } catch { notice(note, 'success', 'Delivered. Refresh to update the inboxes.'); } }
      else notice(note, 'error', 'The backend rejected this message. It was not delivered.');
    } catch (error) { notice(note, 'error', error.message); }
    finally { state.busy = false; render(); }
  }
  [0,1].forEach(i => {
    const panel = document.querySelector('#panel-template').content.firstElementChild.cloneNode(true); panel.classList.add(i ? 'bob' : 'alice');
    const textarea = panel.querySelector('textarea'); textarea.id = 'message-' + i; panel.querySelector('label').htmlFor = textarea.id;
    textarea.addEventListener('input', controls); textarea.addEventListener('keydown', event => { if (event.key === 'Enter' && !event.shiftKey && !event.isComposing) { event.preventDefault(); void send(i); } });
    panel.querySelector('form').addEventListener('submit', event => { event.preventDefault(); void send(i); });
    panels.push({panel, textarea, log:panel.querySelector('.messages')}); document.querySelector('#chat-grid').append(panel);
    selects[i].addEventListener('change', async () => { state.selected[i] = selects[i].value; textarea.value = ''; notice(panel.querySelector('.notice'), '', ''); await refresh(); });
  });
  document.querySelectorAll('[data-view]').forEach(button => button.addEventListener('click', () => showView(button.dataset.view)));
  document.querySelectorAll('[data-tab]').forEach(button => button.addEventListener('click', () => { document.querySelector('#chat-grid').className = 'chat-grid ' + (button.dataset.tab === '0' ? 'show-alice' : 'show-bob'); document.querySelectorAll('[data-tab]').forEach(tab => tab.setAttribute('aria-pressed', tab === button)); }));
  document.querySelector('#refresh').addEventListener('click', refresh); render(); void refresh();
})();
