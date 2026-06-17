import { diffLines } from "diff";

const MAX_DIFF_VALUE = 20_000;

const trimForDiff = (value: string) =>
  value.length > MAX_DIFF_VALUE
    ? `${value.slice(0, MAX_DIFF_VALUE)}\n...[truncated]`
    : value;

export function summarizeFileChange(oldValue: string, newValue: string) {
  let additions = 0;
  let deletions = 0;

  for (const change of diffLines(oldValue, newValue)) {
    if (change.added) additions += change.count ?? 0;
    if (change.removed) deletions += change.count ?? 0;
  }

  return {
    oldValue: trimForDiff(oldValue),
    newValue: trimForDiff(newValue),
    additions,
    deletions,
    truncated:
      oldValue.length > MAX_DIFF_VALUE || newValue.length > MAX_DIFF_VALUE
  };
}
