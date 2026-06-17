# Sandbox snapshot follow-up

Goal: preserve a task sandbox's `/workspace` so the same task can resume faster after the container sleeps or restarts.

## Use the SDK backup API

Use Cloudflare Sandbox SDK directory backups instead of a custom tar/R2 flow.

```ts
const backup = await sandbox.createBackup({
  dir: "/workspace",
  useGitignore: true,
  ttl: 60 * 60 * 24 * 7
});

await sandbox.restoreBackup(backup);
```

This restores files, not running processes, shell sessions, environment variables, or interpreter memory.

## Minimal implementation

- Upgrade `@cloudflare/sandbox` and the Docker base image together so the Worker types and container runtime both support backups.
- Add the required R2 bucket/secrets for SDK backups.
- Store the returned backup handle on `TaskAgent` state, e.g. `workspaceBackup`.
- At the start of a run, restore `workspaceBackup` before creating tools.
- After a successful run, create a fresh `/workspace` backup and save it back to state.

## Defaults

- Snapshot only `/workspace`.
- Use `useGitignore: true`.
- Use a 7 day TTL.
- Keep stable tools in the Docker image; use backups only for mutable workspace files.

## Check

1. Write `/workspace/a.txt`.
2. Create a backup.
3. Delete or change `/workspace/a.txt`.
4. Restore the backup.
5. Confirm `/workspace/a.txt` matches the original content.

References:
- https://developers.cloudflare.com/sandbox/api/backups/
- https://developers.cloudflare.com/sandbox/guides/backup-restore/
