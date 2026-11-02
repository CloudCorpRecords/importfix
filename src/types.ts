/**
 * importfix types.
 *
 * importfix analyses a module graph supplied by the caller.
 * Each module names the paths it imports; an import that names
 * another module in the same input is an internal edge, and
 * an import that names anything else is external (counted,
 * never edged). The result reports circular imports as one
 * representative cycle per cyclic component, with a
 * suggested break point per cycle.
 */

/** One module in the input graph. */
export interface ModuleInput {
  /** The module's own path; must be unique in the input. */
  path: string;
  /** Paths this module imports; may be empty. */
  imports: string[];
}

/** One directed import edge. */
export interface CycleEdge {
  from: string;
  to: string;
}

/** The suggested edge to break for a cycle. */
export interface SuggestedBreak {
  from: string;
  to: string;
  /** Why this edge: its target has the fewest dependents. */
  reason: string;
}

/** One representative cycle for a cyclic component. */
export interface CycleReport {
  /** Cycle nodes in traversal order; the start is not repeated. */
  nodes: string[];
  /** Edges along the cycle; the last edge closes back to nodes[0]. */
  edges: CycleEdge[];
  suggested_break: SuggestedBreak;
}

/** Graph statistics. */
export interface ImportFixStats {
  module_count: number;
  /** Internal edges after duplicate imports collapse. */
  edge_count: number;
  /** Import entries naming non-input paths, duplicates counted as listed. */
  external_imports: number;
  /** Distinct modules appearing in any reported cycle. */
  cyclic_module_count: number;
}

/** The cycle report. */
export interface ImportFixResult {
  has_cycles: boolean;
  cycles: CycleReport[];
  stats: ImportFixStats;
}
