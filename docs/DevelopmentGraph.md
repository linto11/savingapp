# Development Knowledge Graph with Graphify

This project can be explored with Graphify to create a development-focused knowledge graph of the codebase.

## Why this is useful

Based on the Graphify workflow described in the reference article, the main benefits for this project are:

- local-first AST extraction for code structure
- an interactive HTML graph for onboarding and debugging
- a persistent JSON graph for future tooling
- a Markdown report that highlights clusters and bridge components

Reference reading:
- Medium article: https://medium.com/@mustafa.gencc94/graphify-build-a-knowledge-graph-from-your-entire-codebase-without-sending-your-code-to-anyone-1b6924474b50
- Official site: https://graphify.net/

## Project entry points to graph

Focus on these areas first:
- API entry and routers under backend/api
- core settings and startup logic under backend/core
- domain models under backend/domain
- infrastructure wiring under backend/infrastructure
- business logic under backend/services
- React UI under frontend/src

## How to run it locally

### For people cloning the repository

If you just cloned the project and want to understand it before editing code, start here.

1. Open PowerShell in the repository root.
2. Create and activate the Python virtual environment if you have not already done so.
3. Run the helper script:

```powershell
./scripts/graphify-dev.ps1
```

That script will:
1. use the project virtual environment when available
2. install Graphify if needed
3. build the knowledge graph for the repository
4. write the HTML, JSON, and Markdown outputs under [graphify-out/README.md](graphify-out/README.md)
5. open the generated output unless you pass the no-open flag

### After the graph is generated

Use the outputs like this:
- [graphify-out/graph.html](graphify-out/graph.html) for the interactive visual map
- [graphify-out/GRAPH_REPORT.md](graphify-out/GRAPH_REPORT.md) for the written summary and cluster audit
- [graphify-out/graph.json](graphify-out/graph.json) for structured graph data and future tooling

## Current generated snapshot

The latest verified graph build for this repository produced:
- 121 nodes
- 235 edges
- 16 communities

The graph view now uses readable community names such as Forecasting Engine, Database & Supabase, and Domain Models.

## Development link

The first local graph for this repository has already been generated.
Use these outputs for development and onboarding:
- [graphify-out/README.md](graphify-out/README.md)
- [graphify-out/graph.html](graphify-out/graph.html)
- [graphify-out/GRAPH_REPORT.md](graphify-out/GRAPH_REPORT.md)
- [graphify-out/graph.json](graphify-out/graph.json)

If you want to re-run the graph without executing the analysis immediately:

```powershell
./scripts/graphify-dev.ps1 -SkipRun
```
