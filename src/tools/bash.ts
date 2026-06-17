import { tool } from "ai";
import { z } from "zod";

import { truncate } from "./common";

function fallbackBashTitle(command: string) {
  const program = command.trim().split(/\s+/)[0];
  return program ? `Run ${program}` : "Run command";
}

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
        .optional()
        .describe(
          'Clear, concise description of what this command does in active voice. Never use words like "complex" or "risk" in the description.'
        )
    }),
    execute: async ({ command, description }) => {
      const result = await sandbox.exec(command, {
        cwd: "/workspace",
        timeout: 120_000
      });

      return {
        title: description?.trim() || fallbackBashTitle(command),
        success: result.success,
        exitCode: result.exitCode,
        stdout: truncate(result.stdout ?? ""),
        stderr: truncate(result.stderr ?? "")
      };
    }
  });
}
