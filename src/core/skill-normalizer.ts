import { readFile } from 'node:fs/promises';
import path from 'node:path';

import type {
  RawSkill,
  RawSkillExample,
  Skill,
  SkillExample,
} from '../types/skill.js';

async function resolveExampleCode(
  raw: RawSkillExample,
  skillDir: string,
): Promise<SkillExample> {
  const code =
    raw.code_file !== undefined
      ? await readFile(path.resolve(skillDir, raw.code_file), 'utf8')
      : raw.code!;

  return {
    title: raw.title,
    ...(raw.description !== undefined && { description: raw.description }),
    code,
    ...(raw.language !== undefined && { language: raw.language }),
  };
}

export async function normalizeRawSkill(
  raw: RawSkill,
  skillDir: string,
): Promise<Skill> {
  const instructions =
    raw.instructions_file !== undefined
      ? await readFile(path.resolve(skillDir, raw.instructions_file), 'utf8')
      : raw.instructions!;

  const examples =
    raw.examples !== undefined
      ? await Promise.all(
          raw.examples.map(async (ex) => resolveExampleCode(ex, skillDir)),
        )
      : undefined;

  const {
    instructions: _instructions,
    instructions_file: _instructionsFile,
    examples: _examples,
    ...metadata
  } = raw;

  return {
    ...metadata,
    instructions,
    ...(examples !== undefined && { examples }),
  };
}
