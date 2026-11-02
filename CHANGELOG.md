# Changelog

## 0.1.0 (2026-10-27)

- Initial release: `find_import_cycles` MCP tool and `cycles`
  CLI command detecting circular imports in a supplied module
  graph.
- Reports exactly one representative cycle per cyclic
  component — built deterministically from the component's
  lexicographically smallest module — plus a suggested break
  point per cycle, chosen by fewest dependents in the full
  graph.
