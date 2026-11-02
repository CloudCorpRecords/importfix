/**
 * importfix MCP server. Tools: find_import_cycles.
 *
 * Why the low-level Server instead of McpServer: the high-level
 * helper converts zod schemas to JSON Schema and injects keys
 * not in this tool's defined spec ("$schema" and
 * "additionalProperties"), which breaks exact tool-list/schema
 * parity with the spec. This file serves tools/list with the
 * spec's exact input schemas as explicit literals, while zod
 * still validates every tools/call argument set. The core then
 * applies the full validation rules, so error messages name
 * the exact problem (including duplicate module paths).
 *
 * The analysis is pure local computation: no network, no
 * filesystem, no configuration.
 */
import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import {
  CallToolRequestSchema,
  ErrorCode,
  ListToolsRequestSchema,
  McpError,
} from "@modelcontextprotocol/sdk/types.js";
import { z } from "zod";
import { findImportCycles, formatPayload, VERSION } from "./importfix.js";

const FindImportCyclesArgs = z.object({
  modules: z.unknown(),
});

const TOOLS = [
  {
    name: "find_import_cycles",
    description:
      "Detect circular imports in a module graph. Reports exactly one representative cycle per cyclic strongly connected component (not all elementary cycles), plus single-node self-loops, each with the exact cycle nodes and edges and a suggested break point whose target has the fewest dependents in the graph.",
    inputSchema: {
      type: "object" as const,
      properties: {
        modules: {
          type: "array",
          description: "Modules in the graph; each entry names a module path and the paths it imports",
          minItems: 1,
          items: {
            type: "object",
            properties: {
              path: { type: "string", description: "Module path" },
              imports: {
                type: "array",
                description: "Paths this module imports (may be empty)",
                items: { type: "string" },
              },
            },
            required: ["path", "imports"],
          },
        },
      },
      required: ["modules"],
    },
  },
];

function textResult(value: unknown) {
  return {
    content: [
      {
        type: "text" as const,
        text: typeof value === "string" ? value : JSON.stringify(value, null, 2),
      },
    ],
  };
}

function errorResult(err: unknown) {
  return {
    content: [
      { type: "text" as const, text: err instanceof Error ? err.message : String(err) },
    ],
    isError: true,
  };
}

const server = new Server(
  { name: "importfix", version: VERSION },
  { capabilities: { tools: {} } },
);

server.setRequestHandler(ListToolsRequestSchema, async () => ({ tools: TOOLS }));

server.setRequestHandler(CallToolRequestSchema, async (request) => {
  const { name, arguments: args } = request.params;
  try {
    let out: unknown;
    if (name === "find_import_cycles") {
      const parsed = FindImportCyclesArgs.parse(args ?? {});
      out = findImportCycles(parsed.modules);
    } else {
      throw new McpError(ErrorCode.MethodNotFound, `Unknown tool: ${name}`);
    }
    return textResult(formatPayload(out));
  } catch (err) {
    if (err instanceof McpError) throw err;
    return errorResult(err);
  }
});

async function main(): Promise<void> {
  await server.connect(new StdioServerTransport());
}

void main();
