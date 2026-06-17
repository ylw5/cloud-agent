const MAX_OUTPUT = 12_000;

export const truncate = (text: string) =>
  text.length > MAX_OUTPUT
    ? `${text.slice(0, MAX_OUTPUT)}\n...[truncated]`
    : text;
