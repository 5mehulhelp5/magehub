import YAML from 'yaml';

export interface FrontMatterResult {
  data: Record<string, unknown>;
  body: string;
}

/**
 * Parse YAML front-matter from a string.
 * Expects `---\n...\n---\n` at the start of the content.
 * Returns empty data + full body if no front-matter found.
 */
export function parseFrontMatter(content: string): FrontMatterResult {
  const match = /^---\r?\n([\s\S]*?)\r?\n---\r?\n?([\s\S]*)$/.exec(content);

  if (match === null) {
    return { data: {}, body: content };
  }

  const rawYaml = match[1];
  const body = match[2];
  const data = YAML.parse(rawYaml) as Record<string, unknown>;

  return { data, body };
}
