export function resolveShorthand(input: string, candidates: string[]): string {
  const matches = candidates.filter((candidate) => candidate.startsWith(input));

  if (matches.length === 1) {
    return matches[0];
  }

  if (matches.length === 0) {
    throw new Error(`Unknown shorthand: ${input}`);
  }

  throw new Error(`Ambiguous shorthand: ${input} (${matches.join(', ')})`);
}
