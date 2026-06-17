import { tool } from "ai";
import { z } from "zod";

import { truncate } from "./common";

export function createBashTool(
  sandbox: ReturnType<typeof import("@cloudflare/sandbox").getSandbox>
) {
  return tool({
    description:
      "Run a shell command in the isolated Linux sandbox. Provide a concise active-voice description when useful.",
    inputSchema: z.object({
      command: z.string().describe("The command to execute"),
      description: z
        .string()
        .describe(
          'Clear, concise description of what this command does in active voice. Never use words like "complex" or "risk" in the description.'
        )
    }),
    execute: async ({ command }) => {
      const result = await sandbox.exec(command, {
        cwd: "/workspace",
        timeout: 120_000
      });

      return {
        success: result.success,
        exitCode: result.exitCode,
        stdout: truncate(result.stdout ?? ""),
        stderr: truncate(result.stderr ?? "")
      };
    }
  });
}
