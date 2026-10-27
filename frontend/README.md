# SignedChat frontend

Plain HTML, CSS, and JavaScript. No React, TypeScript, npm, downloaded libraries, or build step. All browser assets are local.

## Run on Windows

1. From the repository root, start the [Java backend](../backend/README.md) in its own terminal:

   ```powershell
   cd backend
   .\mvnw.cmd spring-boot:run
   ```

2. In a second terminal at the repository root, run:

   ```powershell
   cd frontend
   .\start.cmd
   ```

3. Open **http://127.0.0.1:5173**. Keep both terminals running. Create users in Users & keys, then choose two users in Direct chats. Enter an existing username on that first page to show its demo key pair.

The launcher uses JDK 21+, already required by the backend. It compiles the tiny development server in memory with Java's source launcher; no installation or package manager is involved. On macOS/Linux use `java tools/DevServer.java` from this directory. Stop with Ctrl+C.

To change the frontend port or backend URL:

```powershell
.\start.cmd 5174 http://127.0.0.1:8080
```

The local server binds only to 127.0.0.1 and forwards `/api` requests to the backend. This avoids cross-origin issues without changing backend code. It is a development helper, not a production server.

## Alternative: serve directly from Spring Boot

Copy **index.html**, **styles.css**, **api.js**, **app.js**, **math.js**, and **math-ui.js** from `frontend/` into `backend/src/main/resources/static/`. Restart the backend and open **http://localhost:8080**. No separate frontend process is needed. Do not copy the Java development helper, Git metadata, or tests into the backend.

Opening index.html by double-clicking lets you see the layout, but API calls require an HTTP server. Use either method above for working messaging.

## Files

- `index.html`: layout and reusable chat-panel template.
- `styles.css`: responsive layout, styles, and accessibility helpers.
- `app.js`: DOM events, user creation, chat rendering, and delivery feedback.
- `api.js`: Fetch API requests, errors, and conversation reconciliation.
- `tools/DevServer.java` and `start.cmd`: optional local static server and API proxy.
- `tests.html` and `tests.js`: dependency-free browser tests.

## Check

Start the local server and open **http://127.0.0.1:5173/tests.html**. The test page checks request encoding, exact message content, rejected delivery, validation and network errors, message ordering, and duplicate messages using isolated responses. No backend is required for these checks.

For live verification: create Alice and Bob, send in both directions, expand **Inspect signature**, check creation and existing-user key display, hide the keys, and refresh the inboxes. On mobile, switch between Alice and Bob with the buttons above the chat. Enter sends; Shift+Enter adds a newline. Message content is transmitted exactly as entered; whitespace-only messages are disabled in the UI. Messages and signatures are rendered as text, including content containing HTML.

## Current scope

The interface matches backend commit fb0e479. Panels are demonstration identities, not authenticated sessions. Accepted badges reflect backend acceptance, not independent browser verification. Keys and inboxes are in memory and disappear on backend restart. Refresh to synchronize after restart. Messages are plaintext; encryption, replay protection, and fingerprint validation are not claimed. The old backend has no timestamps, so the interface preserves observed message order during use but cannot reconstruct historical interleaving across separate inboxes after reload. External messages are fetched with **Refresh inboxes**; there is no polling. Authentication and the Security Lab can be connected when the updated backend is available.

## Multiple users and demo key display

Open **Users & keys** to create any number of named demo users. Select two users in **Conversations** to exchange signed messages. The user selector is not login or authentication.

A successful `POST /api/users` returns both keys with `Cache-Control: no-store`. The public key is Base64 X.509; the private key is Base64 PKCS#8. Closing or cancelling the creation dialog clears both fields. On Page 1 (**Direct chats**), enter an exact existing username to show the pair again using `api.getUserKeys(name)`, backed by `GET /api/users/{username}/keys`. The returned demo identity is selected on the left. This is not authenticated login: anyone who knows the username can retrieve its private key. Hide keys, change the username/selected identity, or leave the tab to clear the display. Secrets are not saved in browser storage or the shared user list. Ordinary user list and lookup endpoints remain public-only. Recreating a user after a server restart generates a new pair.

## Signing math

The **Signing math** tab creates a separate disposable key and does not use chat private keys. It shows exact UTF-8/Base64 payload bytes, SHA-512 inputs and outputs, secret scalar clamping, curve parameters, public key derivation, nonce, challenge, signature scalar, complete signature, and the public verification equation. Expand all 256 rounds for each scalar multiplication. Native browser Web Crypto signs/verifies independently and must match the educational reference arithmetic exactly. Actual chat signing continues to use Java JCA, not this explanatory implementation. SHA-512 compression internals and cryptographic provider machine instructions are not instrumented.

Additional browser assets: `math.js` and `math-ui.js`. Include both when copying the frontend into Spring Boot's static resources. The Dockerfile and local launcher already serve them.

Optional developer checks (Node is only needed for this command, not to run the app):

```powershell
node --test math.test.cjs
```

These checks cover two RFC 8032 test vectors, complete scalar traces, independent native Ed25519 verification, tampering, and exact UTF-8 payload encoding.
