import { readdir, readFile } from 'node:fs/promises';
import path from 'node:path';

import YAML from 'yaml';

import type { Skill } from '../types/skill.js';
import { normalizeRawSkill } from './skill-normalizer.js';
import { validateSkillSchema } from './schema-validator.js';

export interface LoadedSkill {
  filePath: string;
  skill: Skill;
}

async function walkDirectories(dirPath: string): Promise<string[]> {
  const entries = await readdir(dirPath, { withFileTypes: true });
  const files = await Promise.all(
    entries.map(async (entry) => {
      const fullPath = path.join(dirPath, entry.name);
      if (entry.isDirectory()) {
        return walkDirectories(fullPath);
      }

      return [fullPath];
    }),
  );

  return files.flat();
}

export async function listSkillFiles(skillsDir: string): Promise<string[]> {
  try {
    const allFiles = await walkDirectories(skillsDir);
    return allFiles
      .filter((filePath) => filePath.endsWith('skill.yaml'))
      .sort();
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === 'ENOENT') {
      return [];
    }

    throw error;
  }
}

export async function parseSkillFile(filePath: string): Promise<unknown> {
  const content = await readFile(filePath, 'utf8');
  const parsed: unknown = YAML.parse(content);
  return parsed;
}

export async function loadSkillFile(filePath: string): Promise<LoadedSkill> {
  const parsed = await parseSkillFile(filePath);
  const validation = await validateSkillSchema(parsed);

  if (!validation.valid || validation.data === undefined) {
    throw new Error(
      `Invalid skill file ${filePath}: ${validation.errors.join('; ')}`,
    );
  }

  const skillDir = path.dirname(filePath);
  const skill = await normalizeRawSkill(validation.data, skillDir);

  return { filePath, skill };
}

export async function loadAllSkills(skillsDir: string): Promise<LoadedSkill[]> {
  const skillFiles = await listSkillFiles(skillsDir);
  return Promise.all(
    skillFiles.map(async (filePath) => loadSkillFile(filePath)),
  );
}

export async function loadSkillsFromDirectories(
  skillDirs: string[],
): Promise<LoadedSkill[]> {
  const allEntries = await Promise.all(
    skillDirs.map(async (skillDir) => loadAllSkills(skillDir)),
  );
  return allEntries.flat();
}
