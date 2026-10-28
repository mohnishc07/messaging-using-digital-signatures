# SignedChat — messaging with digital signatures

A Java/Spring Boot Ed25519 backend with a React + Vite + TypeScript frontend. Tailwind CSS v4, shadcn/ui, and Kokonut UI provide the obsidian dark interface.

```text
backend/           Java API, Maven wrapper, source and tests
frontend/src/      React components and typed API/math imports
frontend/legacy/   Archived vanilla UI and its tests, for reference
Dockerfile         Node frontend build → Java build → Java-only runtime
render.yaml        Existing Render web service configuration
```

## Run locally

Install JDK 21+ and Node.js 22.12+ (Node 24 recommended).

```powershell
# Terminal 1
cd backend
.\mvnw.cmd spring-boot:run

# Terminal 2, starting at repository root
cd frontend
npm.cmd ci
npm.cmd run dev
```

Open http://127.0.0.1:5173. Vite proxies API requests to http://127.0.0.1:8080. Use `npm.cmd` on Windows if PowerShell blocks npm.ps1. On macOS/Linux, use `./mvnw` and `npm` instead.

Enter a username on Home. Existing users open the Key Vault; unknown names go through creation first. Inspect/copy the demo keys, then continue to Inbox, Compose/public-key search, user simulation, or signing math. Logout clears the in-memory identity and React workspace state.

The username flow is not authentication. The backend deliberately allows retrieving demo private keys by username; use classroom keys only.

## Checks and production build

From frontend/:

```powershell
npm.cmd test
npm.cmd run lint
npm.cmd run build
npm.cmd run preview
```

Tests cover React identity/mail flows, stale-response logout handling, imported REST/math helpers, and the original Ed25519 vectors in math.test.cjs. The build type-checks the application and produces frontend/dist/.

From backend/, run `.\mvnw.cmd test`.

See [frontend/README.md](frontend/README.md) for architecture, registry setup, named imports, legacy references, proxy configuration, and testing. See [backend/README.md](backend/README.md) for API schemas and security behavior.

## Hosting

The root Dockerfile builds frontend/dist/ with Node, embeds it in Spring Boot's static resources, runs the Java tests, and packages the app. The runtime remains Java-only; frontend source, legacy files, and node_modules are not served.

Existing public application: https://signedchat-backend.onrender.com

Frontend and API share that origin. The Java app uses the hosting provider's PORT. Public Git repository URL services on Render require manual deploys after pushing; inspect existing deployments before triggering one.

The prototype stores users, keys, and inboxes only in memory. Restarting or redeploying resets them. Render's free service can sleep, so first requests may be slow. Messages are plaintext, replay protection is absent, and public-key trust is a demo server flag. Signing math uses disposable example keys; real messaging uses established Java cryptography.
