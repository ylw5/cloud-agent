import { useState } from "react";
import { PlusIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from "@/components/ui/select";
import {
  addBranch,
  addRepo,
  getBranches,
  getRepos,
  getSelected,
  setSelected
} from "@/lib/storage";

const ADD_REPO = "__add_repo__";
const ADD_BRANCH = "__add_branch__";

type RepoBranchBarProps = {
  onChange?: () => void;
};

export function RepoBranchBar({ onChange }: RepoBranchBarProps) {
  const [repos, setRepos] = useState(getRepos);
  const [selected, setSelectedState] = useState(getSelected);
  const [repoDialogOpen, setRepoDialogOpen] = useState(false);
  const [branchDialogOpen, setBranchDialogOpen] = useState(false);
  const [newRepo, setNewRepo] = useState("");
  const [newBranch, setNewBranch] = useState("");

  const branches = selected.repo ? getBranches(selected.repo) : ["main"];

  function refresh() {
    setRepos(getRepos());
    setSelectedState(getSelected());
    onChange?.();
  }

  function handleRepoChange(value: string) {
    if (value === ADD_REPO) {
      setRepoDialogOpen(true);
      return;
    }
    const branch = getBranches(value)[0] ?? "main";
    const next = { repo: value, branch };
    setSelected(next);
    setSelectedState(next);
    onChange?.();
  }

  function handleBranchChange(value: string) {
    if (value === ADD_BRANCH) {
      setBranchDialogOpen(true);
      return;
    }
    const next = { ...selected, branch: value };
    setSelected(next);
    setSelectedState(next);
    onChange?.();
  }

  function saveRepo() {
    addRepo(newRepo);
    const repo = newRepo.trim();
    setNewRepo("");
    setRepoDialogOpen(false);
    const next = { repo, branch: "main" };
    setSelected(next);
    refresh();
  }

  function saveBranch() {
    if (!selected.repo) return;
    addBranch(selected.repo, newBranch);
    const branch = newBranch.trim();
    setNewBranch("");
    setBranchDialogOpen(false);
    const next = { ...selected, branch };
    setSelected(next);
    refresh();
  }

  return (
    <>
      <div className="flex items-center justify-center gap-2 text-sm">
        <Select
          value={selected.repo || undefined}
          onValueChange={handleRepoChange}
        >
          <SelectTrigger className="h-8 w-auto min-w-32 border-none bg-transparent shadow-none">
            <SelectValue placeholder="Repository" />
          </SelectTrigger>
          <SelectContent>
            {repos.map((repo) => (
              <SelectItem key={repo} value={repo}>
                {repo}
              </SelectItem>
            ))}
            <SelectItem value={ADD_REPO}>
              <span className="flex items-center gap-1.5 text-muted-foreground">
                <PlusIcon className="size-3.5" />
                Add repository...
              </span>
            </SelectItem>
          </SelectContent>
        </Select>

        {selected.repo ? (
          <>
            <span className="text-muted-foreground">/</span>
            <Select value={selected.branch} onValueChange={handleBranchChange}>
              <SelectTrigger className="h-8 w-auto min-w-24 border-none bg-transparent shadow-none">
                <SelectValue placeholder="Branch" />
              </SelectTrigger>
              <SelectContent>
                {branches.map((branch) => (
                  <SelectItem key={branch} value={branch}>
                    {branch}
                  </SelectItem>
                ))}
                <SelectItem value={ADD_BRANCH}>
                  <span className="flex items-center gap-1.5 text-muted-foreground">
                    <PlusIcon className="size-3.5" />
                    Add branch...
                  </span>
                </SelectItem>
              </SelectContent>
            </Select>
          </>
        ) : null}
      </div>

      <Dialog open={repoDialogOpen} onOpenChange={setRepoDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Add repository</DialogTitle>
          </DialogHeader>
          <Input
            placeholder="owner/repo"
            value={newRepo}
            onChange={(event) => setNewRepo(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === "Enter") saveRepo();
            }}
          />
          <DialogFooter>
            <Button disabled={!newRepo.trim()} onClick={saveRepo} type="button">
              Add
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={branchDialogOpen} onOpenChange={setBranchDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Add branch</DialogTitle>
          </DialogHeader>
          <Input
            placeholder="main"
            value={newBranch}
            onChange={(event) => setNewBranch(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === "Enter") saveBranch();
            }}
          />
          <DialogFooter>
            <Button
              disabled={!newBranch.trim()}
              onClick={saveBranch}
              type="button"
            >
              Add
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
