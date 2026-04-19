# System Architecture

The backend now follows a much cleaner composition style instead of keeping all logic in one route file.

## Current backend structure

- API app entry: [backend/api/app.py](backend/api/app.py)
- API dependencies: [backend/api/dependencies.py](backend/api/dependencies.py)
- Route handlers: [backend/api/routers](backend/api/routers)
- Core configuration and startup logic: [backend/core](backend/core)
- Business services: [backend/services](backend/services)
- Domain models and DTOs: [backend/domain](backend/domain)
- Infrastructure and database wiring: [backend/infrastructure](backend/infrastructure)

## Current frontend structure

- App shell and data loading: [frontend/src/App.jsx](frontend/src/App.jsx)
- Main views: Dashboard, Ledger, and Forecast under [frontend/src/views](frontend/src/views)
- Reusable UI pieces such as settings and transaction modals under [frontend/src/components](frontend/src/components)

## Layer responsibilities

### API layer
The router files under [backend/api/routers](backend/api/routers) now own HTTP concerns only.

### Core layer
The startup and schema compatibility behavior has been moved into [backend/core/bootstrap.py](backend/core/bootstrap.py).

### Service layer
Forecast logic, dashboard aggregation, and SQLite to Supabase sync logic are kept in [backend/services](backend/services).

## Sync and migration logic

The SQLite to Supabase migration and comparison logic now lives in [backend/services/db_sync.py](backend/services/db_sync.py).
The live connection and sync indicator shown in the UI is backed by the settings and sync-status endpoints exposed from the API layer.

## Deployment model

The application is now kept intentionally simple:

- local development uses the Vite frontend with the FastAPI backend
- hosted frontend uses Netlify
- hosted backend uses Render
- the backend URL can be saved from the Settings screen so switching between local and hosted use stays smooth

## Development knowledge graph

A Graphify-based development reference has been added so the codebase can be explored as a local knowledge graph.
See [docs/DevelopmentGraph.md](docs/DevelopmentGraph.md), the landing page [graphify-out/README.md](graphify-out/README.md), the interactive graph [graphify-out/graph.html](graphify-out/graph.html), and the generated report [graphify-out/GRAPH_REPORT.md](graphify-out/GRAPH_REPORT.md).

