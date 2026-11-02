#!/usr/bin/env node
/**
 * importfix CLI.
 *
 *   importfix cycles --modules <modules.json>
 *   importfix mcp
 *
 * The modules file is a JSON array of {path, imports}
 * objects. Pure local computation: no network, no
 * configuration. Argument validation happens before any
 * file is read.
 * Exit codes: 0 success, 1 runtime error (including an
 * unreadable or invalid modules file), 2 usage error.
 */
import { readFileSync } from "node:fs";
import { findImportCycles, formatPayload, VERSION } from "./importfix.js";

function usage(): never {
  console.error(`Usage:
  importfix cycles --modules <modules.json>
  importfix mcp
  importfix --version`);
  process.exit(2);
}

function flag(rest: string[], name: string): string | undefined {
  const i = rest.indexOf(name);
  return i >= 0 ? rest[i + 1] : undefined;
}

async function main(): Promise<void> {
  const [cmd, ...rest] = process.argv.slice(2);
  if (cmd === "--version" || cmd === "-v") {
    console.log(VERSION);
    return;
  }
  if (cmd === "mcp") {
    await import("./mcp.js");
    return;
  }
  if (cmd !== "cycles") usage();

  // ---- Argument validation (before any file is read) ----
  const flags = ["--modules"];
  if (rest.some((a) => a.startsWith("--") && !flags.includes(a))) usage();
  const modulesPath = flag(rest, "--modules");
  if (modulesPath === undefined) usage();

  let modules: unknown;
  try {
    modules = JSON.parse(readFileSync(modulesPath, "utf8"));
  } catch (err) {
    console.error(
      `error: cannot read or parse modules file '${modulesPath}': ${err instanceof Error ? err.message : String(err)}`,
    );
    process.exit(1);
  }

  try {
    const out = findImportCycles(modules);
    console.log(formatPayload(out));
  } catch (err) {
    console.error(`error: ${err instanceof Error ? err.message : String(err)}`);
    process.exit(1);
  }
}

void main();
