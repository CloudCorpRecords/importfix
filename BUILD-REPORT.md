# importfix — build report

**Identity:** `@reneturcios/importfix` · MCP server `io.github.CloudCorpRecords/importfix` · v0.1.0
**Source:** packages-100 program spec, cluster H #96 ("Circular import detector with the exact cycle and a break point suggestion.") — `specs-batch12/importfix.md`. Original build for this program; no external original exists.
**Tranche:** 101+ Batch 12.

## Files

The 19-file factory set: package.json, package-lock.json (Route-3 clean, see below), tsconfig.json, server.json, Dockerfile, .gitignore, README.md, CHANGELOG.md, LICENSE, src/{index,cli,mcp,types,importfix}.ts, test/importfix.test.ts, .github/workflows/{ci,publish,publish-container,registry-publish}.yml. Plus this report and parity-out/.

## Tool

`find_import_cycles` — input `{ modules: [{ path, imports[] }] }` (paths non-empty unique, imports strings). Output `{ has_cycles, cycles: [{ nodes, edges, suggested_break: { from, to, reason } }], stats: { modules, edges_considered, external_imports, components_in_cycles } }`. Graph rules per spec: edges only to in-input modules, duplicates collapse, external imports counted only; one representative cycle per SCC via the deterministic construction (lexicographically smallest start, DFS within the SCC visiting neighbours in lexicographic order); suggested_break = cycle edge whose target has the fewest total dependents, ties by lexicographically smallest "from→to", reason "target has the fewest dependents in the graph (N)". Duplicate module paths are an isError naming the path.

MCP registration uses the SDK low-level Server API with explicit schema literals. No network, no credentials, no upstream. Deterministic pure function over caller-supplied input.

## Verification (coordinator foreground re-run, 2026-10-27)

- Fixture: `harness/fixtures/importfix-tools-original.json` (labelled program spec).
- Parity: **PASS, 100.0, identical 1/1** (tools-file mode vs live stdio server).
- Tests: **14/14 pass** (node:test via tsx) — acyclic graph, 2-cycle, 3-cycle deterministic order, lexicographic neighbour order, self-loop, two SCCs sorted, external imports, duplicate-import collapse, dependent-count tie-break + unique minimum, duplicate-path rejection, three validation rejections.
- `npx tsc --noEmit` exit 0; `node dist/cli.js --version` → 0.1.0.
- Lockfile: Route 3 (offline `--package-lock-only`), name `@reneturcios/importfix`, **128 entries**.
- server.json: description 89 chars (≤100); npm entry carries `version`, OCI entry version-free. Dockerfile label `io.modelcontextprotocol.server.name="io.github.CloudCorpRecords/importfix"`.

## Build-process note

The builder session was interrupted by an infrastructure error ("restart drain in progress") after the files, dist, and lockfile were on disk but before parity and this report. The coordinator completed parity and this report in the foreground from disk; all numbers above are the coordinator's own re-runs, not builder claims.

## Honest gaps / local choices

- Representative-cycle-only reporting per SCC is a documented local choice (the plan asks for "the exact cycle"); full cycle enumeration is a possible later extension and is labelled as such in the spec.
- The pre-publish gate (mcpaudit / mcpvet / shipcheck) has NOT been run on this build by this lane; it runs at publish-wave time.
- Nothing published; no repo created.
