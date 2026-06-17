import { tool } from "ai";
import { z } from "zod";

import { truncate } from "./common";

const WORKSPACE = "/workspace";
const DEFAULT_TIMEOUT_MS = 120_000;
const MAX_TIMEOUT_MS = 600_000;
const BACKGROUND_STARTUP_MS = 500;

const BASH_DESCRIPTION = [
  "Executes a bash command and returns its output.",
  "",
  "Working directory persists between calls within the sandbox session, but prefer absolute paths.",
  "Shell state (env vars, functions) does not persist across calls.",
  "IMPORTANT: Avoid using this tool for cat, head, tail, sed, awk, or echo unless explicitly instructed or after verifying that read/edit cannot accomplish the task. Use read, edit, and write instead.",
  `timeout is in milliseconds: default ${DEFAULT_TIMEOUT_MS}, max ${MAX_TIMEOUT_MS}.`,
  "run_in_background starts a detached process and returns immediately with processId. Use for dev servers and other long-running commands. For long commands that eventually exit, use foreground bash with a higher timeout instead.",
  "Foreground sleep is blocked; poll a condition with a loop or use run_in_background instead.",
  "",
  "Git:",
  "Interactive flags (-i, e.g. git rebase -i, git add -i) are not supported.",
  "Use the gh CLI for GitHub operations (PRs, issues, API).",
  "Commit or push only when the user asks."
].join("\n");

const DESCRIPTION_FIELD = [
  "Clear, concise description of what this command does in active voice.",
  'Never use words like "complex" or "risk".',
  "For simple commands (git, npm, standard CLI tools), keep it brief (5-10 words):",
  '- ls → "List files in current directory"',
  '- git status → "Show working tree status"',
  '- npm install → "Install package dependencies"',
  "For harder-to-parse commands, add enough context:",
  '- find . -name "*.tmp" -exec rm {} \\; → "Find and delete all .tmp files recursively"',
  '- git reset --hard origin/main → "Discard all local changes and match remote main"',
  "- curl -s url | jq '.data[]' → \"Fetch JSON from URL and extract data array elements\""
].join(" ");

const FOREGROUND_SLEEP = /(?:^|[;&|]\s*)sleep(?:\s|$|\d)/;

type Sandbox = ReturnType<typeof import("@cloudflare/sandbox").getSandbox>;

type BashResult = {
  success: boolean;
  exitCode?: number;
  stdout: string;
  stderr: string;
  background?: boolean;
  processId?: string;
  running?: boolean;
  message?: string;
};

function clampTimeout(timeout?: number): number {
  if (timeout === undefined) return DEFAULT_TIMEOUT_MS;
  return Math.min(Math.max(timeout, 1), MAX_TIMEOUT_MS);
}

function isForegroundSleep(command: string): boolean {
  return FOREGROUND_SLEEP.test(command.trim());
}

function formatResult(result: BashResult): BashResult {
  return {
    ...result,
    stdout: truncate(result.stdout),
    stderr: truncate(result.stderr)
  };
}

async function executeForeground(
  sandbox: Sandbox,
  command: string,
  timeoutMs: number
): Promise<BashResult> {
  const result = await sandbox.exec(command, {
    cwd: WORKSPACE,
    timeout: timeoutMs
  });

  return formatResult({
    success: result.success,
    exitCode: result.exitCode,
    stdout: result.stdout ?? "",
    stderr: result.stderr ?? ""
  });
}

async function executeBackground(
  sandbox: Sandbox,
  command: string,
  timeoutMs: number
): Promise<BashResult> {
  const process = await sandbox.startProcess(command, {
    cwd: WORKSPACE,
    timeout: timeoutMs
  });

  await new Promise((resolve) => setTimeout(resolve, BACKGROUND_STARTUP_MS));

  const status = await process.getStatus();
  const logs = await process.getLogs();

  if (status === "failed" || status === "error") {
    return formatResult({
      success: false,
      exitCode: process.exitCode ?? 1,
      background: true,
      processId: process.id,
      stdout: logs.stdout ?? "",
      stderr: logs.stderr ?? ""
    });
  }

  if (status === "completed" || status === "killed") {
    return formatResult({
      success: status === "completed" && (process.exitCode ?? 1) === 0,
      exitCode: process.exitCode,
      background: true,
      processId: process.id,
      stdout: logs.stdout ?? "",
      stderr: logs.stderr ?? ""
    });
  }

  return formatResult({
    success: true,
    background: true,
    running: true,
    processId: process.id,
    stdout: logs.stdout ?? "",
    stderr: logs.stderr ?? "",
    message:
      "Background process started. Inspect output with follow-up bash commands or check process logs."
  });
}

export function createBashTool(sandbox: Sandbox) {
  return tool({
    description: BASH_DESCRIPTION,
    inputSchema: z.object({
      command: z.string().describe("The command to execute"),
      timeout: z
        .number()
        .int()
        .positive()
        .max(MAX_TIMEOUT_MS)
        .optional()
        .describe(`Optional timeout in milliseconds (max ${MAX_TIMEOUT_MS})`),
      description: z.string().describe(DESCRIPTION_FIELD),
      run_in_background: z
        .boolean()
        .optional()
        .describe("Set to true to run this command in the background.")
    }),
    execute: async ({
      command,
      timeout,
      run_in_background: runInBackground
    }) => {
      if (!runInBackground && isForegroundSleep(command)) {
        return formatResult({
          success: false,
          exitCode: 1,
          stdout: "",
          stderr:
            "Foreground sleep is blocked. Use run_in_background for long waits, or poll a condition with a loop instead of sleep."
        });
      }

      const timeoutMs = clampTimeout(timeout);

      if (runInBackground) {
        return executeBackground(sandbox, command, timeoutMs);
      }

      return executeForeground(sandbox, command, timeoutMs);
    }
  });
}
