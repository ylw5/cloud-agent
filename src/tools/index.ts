import { getSandbox } from "@cloudflare/sandbox";

import { createBashTool } from "./bash";
import { createEditTool } from "./edit";
import { createReadTool } from "./read";
import { createWriteTool } from "./write";

export function makeTools(env: Env, sandboxId: string) {
  const sandbox = getSandbox(env.Sandbox, sandboxId);

  return {
    bash: createBashTool(sandbox),
    edit: createEditTool(sandbox),
    read: createReadTool(sandbox),
    write: createWriteTool(sandbox)
  };
}
