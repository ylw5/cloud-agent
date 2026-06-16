import { getToolName, type DynamicToolUIPart, type ToolUIPart } from "ai";

type ToolInput = Record<string, unknown>;
export type ToolPart = ToolUIPart | DynamicToolUIPart;

export function getToolLabel(part: ToolPart): string {
  const name = getToolName(part);
  const input = ("input" in part ? part.input : {}) as ToolInput;

  switch (name) {
    case "bash": {
      const command = typeof input.command === "string" ? input.command : "";
      return command ? `$ ${command}` : "$ bash";
    }
    case "list_files": {
      const path = typeof input.path === "string" ? input.path : "/workspace";
      const output = "output" in part ? part.output : undefined;
      if (
        part.state === "output-available" &&
        output &&
        typeof output === "object" &&
        "files" in output &&
        Array.isArray((output as { files: unknown }).files)
      ) {
        const count = (output as { files: unknown[] }).files.length;
        return `Explored ${count} files`;
      }
      return `$ List ${path}`;
    }
    case "read_file": {
      const path = typeof input.path === "string" ? input.path : "file";
      return `Read ${path}`;
    }
    case "write_file": {
      const path = typeof input.path === "string" ? input.path : "file";
      return `Write ${path}`;
    }
    default:
      return name;
  }
}

export function formatToolOutput(part: ToolPart): string | null {
  if (part.state === "output-error" && "errorText" in part) {
    return part.errorText ?? "Unknown error";
  }

  if (part.state !== "output-available" || !("output" in part)) {
    return null;
  }

  const output = part.output;
  const name = getToolName(part);

  if (name === "bash" && output && typeof output === "object") {
    const result = output as {
      stdout?: string;
      stderr?: string;
      exitCode?: number;
      success?: boolean;
    };
    const chunks = [
      result.stdout?.trim(),
      result.stderr?.trim() ? `[stderr]\n${result.stderr.trim()}` : undefined,
      result.exitCode !== undefined ? `[exit ${result.exitCode}]` : undefined
    ].filter(Boolean);
    return chunks.join("\n\n") || "(no output)";
  }

  if (typeof output === "string") return output;
  return JSON.stringify(output, null, 2);
}
