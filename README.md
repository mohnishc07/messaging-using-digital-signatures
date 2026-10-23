# Messaging using digital signatures

The project separates the backend and frontend into their own folders.

```text
messaging-using-digital-signatures/
├── backend/       Java / Spring Boot API, source, tests, and Maven wrapper
└── README.md      Project overview
```

The frontend will be added in a separate `frontend/` folder alongside `backend/`.

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

## Test the backend

From the `backend/` directory:

```powershell
.\mvnw.cmd test
```

On macOS / Linux use `./mvnw test`.

See [backend/README.md](backend/README.md) for the API endpoints, examples, signing design, and current limitations.
