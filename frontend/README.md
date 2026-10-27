# SignedChat frontend

Plain HTML, CSS, and JavaScript. No frontend framework, npm installation, or build step is needed to run the website.

## Run

Start the backend from `backend/` with `.\mvnw.cmd spring-boot:run`. In a second terminal, run `.\start.cmd` from `frontend/`, then open http://127.0.0.1:5173.

The launcher requires JDK 21+ and proxies API requests to port 8080. Run `.\start.cmd 5174 http://127.0.0.1:8080` to change the frontend port/backend address. On macOS/Linux, use `java tools/DevServer.java` from this directory. Keep both servers running; stop them with Ctrl+C.

The production Dockerfile serves the six browser assets directly from Spring Boot. For manual Spring hosting, copy index.html, styles.css, api.js, app.js, math.js, and math-ui.js into backend/src/main/resources/static/. Tests and local development tools are not production assets.

## Screen flow

1. **Home:** enter a username. The existing-user key lookup opens the Key Vault. Only a 404 routes to creation; network/server failures stay on Home with an error.
2. **Create User:** create the new identity through the existing API, then open its Key Vault. A duplicate-creation conflict returns to Home so the existing identity can be opened.
3. **Key Vault (Page 1):** shows username, Base64 X.509 public key, Base64 PKCS#8 private key, copy buttons, trust status, and Continue to Mail Workspace.
4. **Mail workspace:** opens the selected identity's inbox. The header always offers Key Vault and Logout. Reopening the vault fetches keys again.

This is demo access by username, not authenticated login. The existing backend permits anyone who knows a username to retrieve its demo private key. Use classroom identities only.

Session identity and public state live only in memory. No keys or identity are persisted to localStorage/sessionStorage. Private keys are shown only in the vault fields, which clear when continuing or logging out. Logout also clears drafts, inbox/reader, recipient results, simulation state, and math output. Response guards prevent late requests from reopening old sessions or repopulating old messages. Logout does not delete server users or revoke keys; copied clipboard contents remain under the user's control. Reloading starts at Home.

## Mail workspace

- **Inbox:** all messages received by the current demo user, regardless of sender, with a message list and full reading pane. Search by sender/message; select an item to read it, inspect/copy its Ed25519 signed package, reply, or trace its payload. The TIME field shows a valid ISO timestamp only if the server supplies `timestamp`; otherwise it explicitly says **Not provided by server**. The current backend does not supply timestamps, so no sent/received time is invented.
- **Compose / search:** search registered recipients by username or Base64 public key from the workspace header or compose directory. Clicking a match immediately opens that user's compose view with their name and full public key (plus a public-key copy button). The To/From header, message body, and Sign & Send action use the current demo identity. Message content is transmitted exactly; whitespace-only submissions are disabled.
- **User simulation:** select any two registered users and send from either side without switching the workspace identity. On narrow screens, switch between panels using tabs. Register more participants through the Home/create flow.
- **Signing math:** the existing disposable-key Ed25519 trace, including complete scalar traces and native WebCrypto cross-check. Math generation/output is invalidated and cleared on logout.

Acceptance badges reflect backend delivery verification, not independent browser authentication. The API has no message timestamps, unique IDs, read receipts, subjects, sent-mail folder, or WebSocket updates; the interface does not invent them. Refresh updates inbox/users/simulation explicitly. Inbox repeats remain visible because replay prevention is absent. User/public-key search is filtering fetched public records, not authenticating fingerprints. The six-experiment Attack Lab is a later implementation.

## Files

- index.html: Home, creation, vault, workspace views, and simulation template.
- app.js: in-memory identity/session flow, async response guards, inbox, compose, simulation, key display/copy, logout.
- styles.css: responsive dark developer/mail aesthetic.
- api.js: established API calls, errors, exact request encoding, and conversation reconciliation.
- math.js / math-ui.js: educational Ed25519 arithmetic and trace UI. Actual messaging uses Java cryptography.
- tools/DevServer.java / start.cmd: optional Java development server.
- tests.html / tests.js: dependency-free browser API tests.
- flow.test.cjs: optional DOM regression tests for the multi-screen flow.
- math.test.cjs: optional native Ed25519 test-vector checks.

## Verification

Open http://127.0.0.1:5173/tests.html to run browser API tests without a backend.

Optional developer-only tests use Node. Math tests need no third-party package:

```powershell
node --test frontend/math.test.cjs
```

Flow tests additionally use jsdom as a test-only dependency. From the repository root:

```powershell
npm.cmd install --prefix ../signedchat-test-tools --no-save jsdom
$env:NODE_PATH = (Resolve-Path ../signedchat-test-tools/node_modules).Path
node --test frontend/flow.test.cjs frontend/math.test.cjs
```

These cover existing/new users, 404 versus network errors, duplicate creation, copyable key fields, all-sender inbox/search, exact-content sending, logout/session separation, and late key/inbox/math results after logout. Test fixtures contain synthetic keys; no real private keys are logged.

For manual checks: create two identities; inspect the vault and continue; send between them; refresh/reopen the receiving identity's inbox; inspect the signature; run simulation/math; log out and confirm Home and cleared fields. Backend restarts reset users, keys, and inboxes.
