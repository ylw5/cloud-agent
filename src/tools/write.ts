import { tool } from "ai";
import { z } from "zod";

export function createWriteTool(
  sandbox: ReturnType<typeof import("@cloudflare/sandbox").getSandbox>
) {
  return tool({
    description:
      "Create or overwrite a UTF-8 text file in the sandbox filesystem.",
    inputSchema: z.object({
      file_path: z.string().describe("The absolute path to the file to write"),
      content: z.string().describe("The content to write to the file")
    }),
    execute: async ({ file_path, content }) => {
      await sandbox.writeFile(file_path, content);
      return { ok: true, path: file_path };
    }
  });
}
