# Messaging using digital signatures

The project separates the backend and frontend into their own folders.

```text
messaging-using-digital-signatures/
├── backend/       Java / Spring Boot API, source, tests, and Maven wrapper
├── frontend/      Plain HTML, CSS, JavaScript, and local server launcher
└── README.md      Project overview
```

The frontend and backend live together in this repository. No Node.js, npm, React, or frontend build step is required.

## Run the backend

Requires JDK 21 or newer. No Maven installation is needed.

Windows PowerShell:

```powershell
cd backend
.\mvnw.cmd spring-boot:run
```

macOS / Linux:

```sh
cd backend
./mvnw spring-boot:run
```

The API runs at **http://localhost:8080**. Keep this terminal running while using the frontend.

## Run the frontend

Open a second terminal at the repository root:

```powershell
cd frontend
.\start.cmd
```

Open **http://127.0.0.1:5173**. Create Alice and Bob, then exchange messages. Keep both terminals running.

On macOS / Linux, run `cd frontend` and `java tools/DevServer.java`.

The frontend launcher uses the same JDK 21+ prerequisite as the backend. Its local development server forwards `/api` to port 8080. To use another frontend port, run `.\start.cmd 5174` from `frontend/`. Stop either server with Ctrl+C.

## Check the frontend

With the frontend server running, open **http://127.0.0.1:5173/tests.html** for the eight dependency-free browser tests.

## Test the backend

From the `backend/` directory:

```powershell
.\mvnw.cmd test
```

On macOS / Linux use `./mvnw test`.

See [backend/README.md](backend/README.md) for the API endpoints, examples, signing design, and current limitations.

See [frontend/README.md](frontend/README.md) for frontend configuration, operation, and optional hosting directly from Spring Boot.

## Host the backend on Render

The root `Dockerfile` builds and tests the Java backend, then runs its JAR on the hosting provider's `PORT`. The `render.yaml` Blueprint requests one free Docker web service. Import this repository as a Render Blueprint to deploy it. The frontend remains hosted on ChatGPT Sites.

`FRONTEND_ORIGIN` permits browser requests from the exact deployed ChatGPT Site origin. It does not add authentication. Once Render returns the backend HTTPS URL, set the Site's `dist/config.js` API origin and republish it.

The current backend is a classroom prototype. Users, keys, and inboxes are in memory and disappear on restart. Render's free services can spin down when idle, so initial requests may take longer and demo data can be lost. No database is configured.
