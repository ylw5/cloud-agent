import type { DynamicToolUIPart, ToolUIPart } from "ai";

type ToolInput = Record<string, unknown>;
export type ToolPart = ToolUIPart | DynamicToolUIPart;

export function getToolName(part: ToolPart): string {
  return part.type === "dynamic-tool"
    ? part.toolName || "tool"
    : part.type.slice("tool-".length);
}

function getName(part: ToolPart): string {
  return getToolName(part);
}

function getToolInput(part: ToolPart): ToolInput {
  const input = "input" in part ? part.input : undefined;
  return input && typeof input === "object" ? (input as ToolInput) : {};
}

export function getBashTitle(part: ToolPart): string | null {
  if (part.state === "input-streaming") {
    return null;
  }

  const input = getToolInput(part);
  const description =
    typeof input.description === "string" ? input.description.trim() : "";
  return description || null;
}

export type ToolDisplayStyle = "plain" | "boxed";

export function getToolDisplayStyle(part: ToolPart): ToolDisplayStyle {
  const name = getName(part);
  if (name === "bash") return "boxed";
  return "plain";
}

export function getToolLabel(part: ToolPart): string {
  const name = getName(part);
  const input = getToolInput(part);

  switch (name) {
    case "bash": {
      const title = getBashTitle(part);
      return title ? `$ ${title}` : "$ Run command";
    }
    case "read": {
      const path =
        typeof input.file_path === "string" ? input.file_path : "file";
      const fileName = path.split("/").pop() || path;
      return `Read ${fileName}`;
    }
    case "write": {
      const path =
        typeof input.file_path === "string" ? input.file_path : "file";
      const fileName = path.split("/").pop() || path;
      return `Write ${fileName}`;
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
  const name = getName(part);
  const input = getToolInput(part);

  if (name === "bash" && output && typeof output === "object") {
    const command = typeof input.command === "string" ? input.command : "";
    const result = output as {
      stdout?: string;
      stderr?: string;
      exitCode?: number;
    };
    const body = [
      result.stdout?.trim(),
      result.stderr?.trim() ? `[stderr]\n${result.stderr.trim()}` : undefined,
      result.exitCode !== undefined && result.exitCode !== 0
        ? `[exit ${result.exitCode}]`
        : undefined
    ]
      .filter(Boolean)
      .join("\n\n");

    if (!command && !body) return null;
    if (!command) return body || "(no output)";
    return body ? `$ ${command}\n\n${body}` : `$ ${command}`;
  }

  if (name === "read" && output && typeof output === "object") {
    const content =
      "content" in output && typeof output.content === "string"
        ? output.content
        : null;
    return content ?? JSON.stringify(output, null, 2);
  }

  if (name === "write" && output && typeof output === "object") {
    const path =
      "path" in output && typeof output.path === "string" ? output.path : null;
    return path ? `Wrote ${path}` : "File saved";
  }

  if (typeof output === "string") return output;
  return JSON.stringify(output, null, 2);
}
