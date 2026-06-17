import { tool } from "ai";
import { z } from "zod";

import { summarizeFileChange } from "./file-change";

const EDIT_DESCRIPTION = [
  "Performs exact string replacement in a file.",
  "",
  "You must Read the file in this conversation before editing, or the call will fail.",
  "old_string must match the file exactly, including indentation, and be unique — the edit fails otherwise.",
  "Strip the Read line prefix (line number + tab) before matching.",
  "replace_all: true replaces every occurrence instead."
].join("\n");

export function createEditTool(
  sandbox: ReturnType<typeof import("@cloudflare/sandbox").getSandbox>
) {
  return tool({
    description: EDIT_DESCRIPTION,
    inputSchema: z
      .object({
        file_path: z
          .string()
          .describe("The absolute path to the file to modify"),
        old_string: z.string().min(1).describe("The text to replace"),
        new_string: z
          .string()
          .describe(
            "The text to replace it with (must be different from old_string)"
          ),
        replace_all: z
          .boolean()
          .optional()
          .describe("Replace all occurrences of old_string (default false)")
      })
      .strict(),
    execute: async ({ file_path, old_string, new_string, replace_all }) => {
      if (old_string === new_string) {
        throw new Error("new_string must be different from old_string");
      }

      const oldValue = (await sandbox.readFile(file_path)).content;
      const matches = oldValue.split(old_string).length - 1;

      if (matches === 0) {
        throw new Error("old_string was not found in the file");
      }

      if (!replace_all && matches > 1) {
        throw new Error(
          "old_string appears more than once; pass replace_all=true to replace all occurrences"
        );
      }

      const newValue = replace_all
        ? oldValue.replaceAll(old_string, new_string)
        : oldValue.replace(old_string, new_string);

      await sandbox.writeFile(file_path, newValue);

      return {
        ok: true,
        path: file_path,
        replaceAll: replace_all ?? false,
        ...summarizeFileChange(oldValue, newValue)
      };
    }
  });
}
