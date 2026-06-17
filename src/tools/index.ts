import { getSandbox } from "@cloudflare/sandbox";

import { createBashTool } from "./bash";
import { createReadFileTool } from "./read-file";
import { createWriteFileTool } from "./write-file";

export function makeTools(env: Env, sandboxId: string) {
  const sandbox = getSandbox(env.Sandbox, sandboxId);

  return {
    bash: createBashTool(sandbox),
    read_file: createReadFileTool(sandbox),
    write_file: createWriteFileTool(sandbox)
  };
}
