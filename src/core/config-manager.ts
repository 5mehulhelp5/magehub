import { readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';

import YAML from 'yaml';

import type { MageHubConfig } from '../types/config.js';
import { createMageHubPaths } from './paths.js';
import { isPathInsideProject, resolveProjectRelativePath } from './runtime-assets.js';
import { validateConfigSchema } from './schema-validator.js';

export interface ConfigLoadResult {
  config: MageHubConfig;
  filePath: string;
}

export function createDefaultConfig(): MageHubConfig {
  return {
    version: '1',
    skills: [],
    format: 'claude',
    include_examples: true,
    include_antipatterns: true,
  };
}

export function resolveOutputPath(rootDir: string, format: NonNullable<MageHubConfig['format']>): string {
  const defaults: Record<NonNullable<MageHubConfig['format']>, string> = {
    claude: 'CLAUDE.md',
    opencode: path.join('.opencode', 'skills', 'magehub.md'),
    cursor: '.cursorrules',
    codex: 'AGENTS.md',
    qoder: path.join('.qoder', 'context.md'),
    trae: path.join('.trae', 'rules', 'magehub.md'),
    markdown: 'MAGEHUB.md',
  };

  return path.join(rootDir, defaults[format]);
}

export async function loadConfig(rootDir: string): Promise<ConfigLoadResult> {
  const { configFile } = createMageHubPaths(rootDir);
  const content = await readFile(configFile, 'utf8');
  const parsed: unknown = YAML.parse(content);
  const validation = await validateConfigSchema(parsed);

  if (!validation.valid || validation.data === undefined) {
    throw new Error(`Invalid config file ${configFile}: ${validation.errors.join('; ')}`);
  }

  return {
    config: validation.data,
    filePath: configFile,
  };
}

export async function validateConfigFile(rootDir: string): Promise<{ filePath: string; errors: string[]; valid: boolean }> {
  const { configFile } = createMageHubPaths(rootDir);
  const content = await readFile(configFile, 'utf8');
  const parsed: unknown = YAML.parse(content);
  const validation = await validateConfigSchema(parsed);

  return {
    filePath: configFile,
    valid: validation.valid,
    errors: validation.errors,
  };
}

export async function saveConfig(rootDir: string, config: MageHubConfig): Promise<void> {
  const { configFile } = createMageHubPaths(rootDir);
  await writeFile(configFile, YAML.stringify(config), 'utf8');
}

export function resolveCustomSkillsPath(rootDir: string, config: MageHubConfig): string | undefined {
  if (config.custom_skills_path === undefined || config.custom_skills_path.trim() === '') {
    return undefined;
  }

  const resolved = resolveProjectRelativePath(rootDir, config.custom_skills_path);
  if (!isPathInsideProject(rootDir, resolved)) {
    throw new Error('custom_skills_path must stay within the project root');
  }

  return resolved;
}
