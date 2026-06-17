import { tool } from "ai";
import { z } from "zod";

import { truncate } from "./common";

function sliceLines(content: string, offset?: number, limit?: number) {
  if (offset === undefined && limit === undefined) return content;

  const lines = content.split("\n");
  const start = offset ?? 0;
  const end = limit === undefined ? undefined : start + limit;
  return lines.slice(start, end).join("\n");
}

export function createReadTool(
  sandbox: ReturnType<typeof import("@cloudflare/sandbox").getSandbox>
) {
  return tool({
    description: "Read a UTF-8 text file from the sandbox filesystem.",
    inputSchema: z.object({
      file_path: z.string().describe("The absolute path to the file to read"),
      offset: z
        .number()
        .int()
        .nonnegative()
        .optional()
        .describe(
          "The line number to start reading from. Only provide if the file is too large to read at once"
        ),
      limit: z
        .number()
        .int()
        .positive()
        .optional()
        .describe(
          "The number of lines to read. Only provide if the file is too large to read at once."
        )
    }),
    execute: async ({ file_path, offset, limit }) => {
      const file = await sandbox.readFile(file_path);
      return { content: truncate(sliceLines(file.content, offset, limit)) };
    }
  });
}
