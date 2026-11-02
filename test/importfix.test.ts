import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { findImportCycles } from "../src/importfix.js";

/**
 * All tests are pure local computation over inline module
 * graphs: no filesystem, no network. The deterministic
 * representative-cycle construction and the suggested-break
 * rule are pinned by exact node / edge expectations.
 */

describe("findImportCycles — cycle detection", () => {
  it("reports no cycles for an acyclic graph", () => {
    const out = findImportCycles([
      { path: "a", imports: ["b"] },
      { path: "b", imports: ["c"] },
      { path: "c", imports: [] },
    ]);
    assert.equal(out.has_cycles, false);
    assert.deepEqual(out.cycles, []);
    assert.deepEqual(out.stats, {
      module_count: 3,
      edge_count: 2,
      external_imports: 0,
      cyclic_module_count: 0,
    });
  });

  it("reports a simple 2-cycle with exact nodes and edges", () => {
    const out = findImportCycles([
      { path: "a", imports: ["b"] },
      { path: "b", imports: ["a"] },
    ]);
    assert.equal(out.has_cycles, true);
    assert.equal(out.cycles.length, 1);
    assert.deepEqual(out.cycles[0].nodes, ["a", "b"]);
    assert.deepEqual(out.cycles[0].edges, [
      { from: "a", to: "b" },
      { from: "b", to: "a" },
    ]);
    assert.equal(out.stats.cyclic_module_count, 2);
  });

  it("reports a 3-cycle in deterministic traversal order regardless of input order", () => {
    const out = findImportCycles([
      { path: "c", imports: ["a"] },
      { path: "b", imports: ["c"] },
      { path: "a", imports: ["b"] },
    ]);
    assert.equal(out.cycles.length, 1);
    assert.deepEqual(out.cycles[0].nodes, ["a", "b", "c"]);
    assert.deepEqual(out.cycles[0].edges, [
      { from: "a", to: "b" },
      { from: "b", to: "c" },
      { from: "c", to: "a" },
    ]);
  });

  it("visits neighbours in lexicographic order, not import-list order", () => {
    // a lists c before b, but the DFS must try b first and
    // close a -> b -> a before ever considering c.
    const out = findImportCycles([
      { path: "a", imports: ["c", "b"] },
      { path: "b", imports: ["a"] },
      { path: "c", imports: ["a"] },
    ]);
    assert.equal(out.cycles.length, 1);
    assert.deepEqual(out.cycles[0].nodes, ["a", "b"]);
    assert.deepEqual(out.cycles[0].edges, [
      { from: "a", to: "b" },
      { from: "b", to: "a" },
    ]);
  });

  it("reports a self-loop as a one-node cycle", () => {
    const out = findImportCycles([
      { path: "a", imports: ["a"] },
      { path: "b", imports: [] },
    ]);
    assert.equal(out.has_cycles, true);
    assert.equal(out.cycles.length, 1);
    assert.deepEqual(out.cycles[0].nodes, ["a"]);
    assert.deepEqual(out.cycles[0].edges, [{ from: "a", to: "a" }]);
    assert.deepEqual(out.cycles[0].suggested_break, {
      from: "a",
      to: "a",
      reason: "target has the fewest dependents in the graph (1)",
    });
    assert.equal(out.stats.edge_count, 1);
    assert.equal(out.stats.cyclic_module_count, 1);
  });

  it("reports two separate SCCs sorted by their first node", () => {
    const out = findImportCycles([
      { path: "x", imports: ["y"] },
      { path: "y", imports: ["x"] },
      { path: "m", imports: ["n"] },
      { path: "n", imports: ["m"] },
      { path: "solo", imports: ["x"] },
    ]);
    assert.equal(out.cycles.length, 2);
    assert.deepEqual(out.cycles[0].nodes, ["m", "n"]);
    assert.deepEqual(out.cycles[1].nodes, ["x", "y"]);
    assert.equal(out.stats.cyclic_module_count, 4);
  });

  it("counts external imports without forming edges from them", () => {
    const out = findImportCycles([
      { path: "a", imports: ["b", "fs", "fs", "left-pad"] },
      { path: "b", imports: [] },
    ]);
    assert.equal(out.has_cycles, false);
    assert.equal(out.stats.edge_count, 1);
    assert.equal(out.stats.external_imports, 3);
  });

  it("collapses duplicate imports into a single edge", () => {
    const out = findImportCycles([
      { path: "a", imports: ["b", "b", "b"] },
      { path: "b", imports: ["a", "a"] },
    ]);
    assert.equal(out.stats.edge_count, 2);
    assert.equal(out.cycles.length, 1);
    assert.deepEqual(out.cycles[0].nodes, ["a", "b"]);
  });
});

describe("findImportCycles — suggested break", () => {
  it("breaks a dependent-count tie by the lexicographically smallest from→to", () => {
    // Dependents: a=1 (c), b=3 (a, d, e), c=1 (b). Cycle
    // edges a->b (target 3), b->c (target 1), c->a (target
    // 1): the fewest-dependents tie is between b->c and
    // c->a, and "b→c" is lexicographically smaller.
    const out = findImportCycles([
      { path: "a", imports: ["b"] },
      { path: "b", imports: ["c"] },
      { path: "c", imports: ["a"] },
      { path: "d", imports: ["b"] },
      { path: "e", imports: ["b"] },
    ]);
    assert.deepEqual(out.cycles[0].suggested_break, {
      from: "b",
      to: "c",
      reason: "target has the fewest dependents in the graph (1)",
    });
  });

  it("picks the unique fewest-dependent target when there is no tie", () => {
    // Dependents: a=2 (b, c), b=1 (a). Cycle edges a->b
    // (target 1) and b->a (target 2): a->b wins outright.
    const out = findImportCycles([
      { path: "a", imports: ["b"] },
      { path: "b", imports: ["a"] },
      { path: "c", imports: ["a"] },
    ]);
    assert.deepEqual(out.cycles[0].suggested_break, {
      from: "a",
      to: "b",
      reason: "target has the fewest dependents in the graph (1)",
    });
  });
});

describe("findImportCycles — validation", () => {
  it("rejects duplicate module paths, naming them", () => {
    assert.throws(
      () =>
        findImportCycles([
          { path: "a", imports: [] },
          { path: "b", imports: [] },
          { path: "a", imports: [] },
        ]),
      /duplicate module paths: a/,
    );
  });

  it("rejects missing or empty modules", () => {
    assert.throws(() => findImportCycles(undefined), /modules is required/);
    assert.throws(() => findImportCycles("nope"), /modules is required/);
    assert.throws(() => findImportCycles([]), /modules must not be empty/);
  });

  it("rejects an item missing path or imports", () => {
    assert.throws(
      () => findImportCycles([{ imports: [] }]),
      /missing a string path/,
    );
    assert.throws(
      () => findImportCycles([{ path: "a" }]),
      /missing imports/,
    );
  });

  it("rejects imports that are not an array", () => {
    assert.throws(
      () => findImportCycles([{ path: "a", imports: "b" }]),
      /imports must be an array/,
    );
  });
});
