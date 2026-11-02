# importfix

Circular imports are easy to create and miserable to unwind
by eye: the compiler names a file, not the loop. importfix
takes a module graph — each module's path and the paths it
imports — and works out where the loops actually are.

For every cyclic component it reports exactly one
representative cycle: the exact nodes in traversal order and
the edges between them, closing back to the start. It does
not enumerate every elementary cycle; one exact, reproducible
cycle per component is the contract. Each cycle also carries
a suggested break point — the cycle edge to remove first,
chosen because its target has the fewest dependents in the
whole graph, so breaking it disturbs the least-imported
module on the loop.

The graph rules are strict about what counts:

- An import only becomes an edge when it names another
  module in the same input. Imports of anything else are
  external: counted in the stats, never edged.
- Duplicate imports collapse into one edge.
- A module importing itself is a cycle of one, reported
  like any other.
- The representative cycle is deterministic: it starts at
  the component's lexicographically smallest module and
  follows neighbours in lexicographic order, so the same
  graph always yields the same answer.

Pure local computation: no network, no filesystem reads of
your source tree — the graph is supplied by the caller.

## CLI

```bash
npx @reneturcios/importfix cycles --modules modules.json
npx @reneturcios/importfix --version
```

`modules.json` contains the modules array:

```json
[
  {"path": "src/a.ts", "imports": ["src/b.ts"]},
  {"path": "src/b.ts", "imports": ["src/a.ts", "node:fs"]}
]
```

The command prints the report as JSON:

```json
{
  "has_cycles": true,
  "cycles": [
    {
      "nodes": ["src/a.ts", "src/b.ts"],
      "edges": [
        {"from": "src/a.ts", "to": "src/b.ts"},
        {"from": "src/b.ts", "to": "src/a.ts"}
      ],
      "suggested_break": {
        "from": "src/a.ts",
        "to": "src/b.ts",
        "reason": "target has the fewest dependents in the graph (1)"
      }
    }
  ],
  "stats": {
    "module_count": 2,
    "edge_count": 2,
    "external_imports": 1,
    "cyclic_module_count": 2
  }
}
```

Exit codes: `0` on success, `1` on a runtime error
(including an unreadable or invalid modules file), `2` on
a usage error.

## MCP server

```bash
npx -y @reneturcios/importfix mcp
```

MCP client config:

```json
{
  "mcpServers": {
    "importfix": {
      "command": "npx",
      "args": ["-y", "@reneturcios/importfix", "mcp"]
    }
  }
}
```

### Tools

- `find_import_cycles` — Detect circular imports in a
  module graph and report one representative cycle per
  cyclic component, with a suggested break point.
  - `modules` (array, required, at least one item) —
    modules as `{path, imports}` objects; `path` is the
    module's own path and `imports` lists the paths it
    imports (may be empty)

## Docker

```bash
docker run -i ghcr.io/cloudcorprecords/importfix
docker run --rm -v "$PWD:/w" ghcr.io/cloudcorprecords/importfix cycles --modules /w/modules.json
```

## Development

```bash
npm install
npm run build   # tsc -> dist/
npm test        # tsx --test test/*.test.ts (pure local, no network)
npm run dev     # run the CLI from source
```

## License

MIT — Copyright (c) 2026 Rene Turcios
