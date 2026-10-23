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

3. Open **http://127.0.0.1:5173**. Keep both terminals running. Create Alice and Bob, then send from either panel.

The launcher uses JDK 21+, already required by the backend. It compiles the tiny development server in memory with Java's source launcher; no installation or package manager is involved. On macOS/Linux use `java tools/DevServer.java` from this directory. Stop with Ctrl+C.

To change the frontend port or backend URL:

```powershell
.\start.cmd 5174 http://127.0.0.1:8080
```

The local server binds only to 127.0.0.1 and forwards `/api` requests to the backend. This avoids cross-origin issues without changing backend code. It is a development helper, not a production server.

## Alternative: serve directly from Spring Boot

Copy **index.html**, **styles.css**, **api.js**, and **app.js** from `frontend/` into `backend/src/main/resources/static/`. Restart the backend and open **http://localhost:8080**. No separate frontend process is needed. Do not copy the Java development helper, Git metadata, or tests into the backend.

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

For live verification: create Alice and Bob, send in both directions, expand **Inspect signature**, view **Public key**, and refresh the inboxes. On mobile, switch between Alice and Bob with the buttons above the chat. Enter sends; Shift+Enter adds a newline. Message content is transmitted exactly as entered; whitespace-only messages are disabled in the UI. Messages and signatures are rendered as text, including content containing HTML.

## Current scope

The interface matches backend commit fb0e479. Panels are demonstration identities, not authenticated sessions. Accepted badges reflect backend acceptance, not independent browser verification. Keys and inboxes are in memory and disappear on backend restart. Refresh to synchronize after restart. Messages are plaintext; encryption, replay protection, and fingerprint validation are not claimed. The old backend has no timestamps, so the interface preserves observed message order during use but cannot reconstruct historical interleaving across separate inboxes after reload. External messages are fetched with **Refresh inboxes**; there is no polling. Authentication and the Security Lab can be connected when the updated backend is available.
