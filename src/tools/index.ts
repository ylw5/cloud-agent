import { createBashTool } from "./bash";
import { createEditTool } from "./edit";
import { createReadTool } from "./read";
import { createWriteTool } from "./write";

type Sandbox = ReturnType<typeof import("@cloudflare/sandbox").getSandbox>;

export function makeTools(sandbox: Sandbox) {
  return {
    bash: createBashTool(sandbox),
    edit: createEditTool(sandbox),
    read: createReadTool(sandbox),
    write: createWriteTool(sandbox)
  };
}
