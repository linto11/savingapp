# Graphify Development Output

This folder contains the generated local knowledge graph for the repository.

## Available outputs

- [graph.html](graph.html)
- [graph.json](graph.json)
- [GRAPH_REPORT.md](GRAPH_REPORT.md)

## Latest verified snapshot

- 121 nodes
- 235 edges
- 16 communities

## Using this after cloning the repo

If you cloned the repository and want to understand the architecture quickly:

1. go to the repository root
2. run the helper script below
3. open [graph.html](graph.html)
4. click nodes, inspect neighbors, and filter by community

To refresh the development graph, run:

```powershell
./scripts/graphify-dev.ps1
```

To only validate the helper without generating the graph:

```powershell
./scripts/graphify-dev.ps1 -SkipRun
```
