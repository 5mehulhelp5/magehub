import type { Command } from 'commander';

import { loadConfig, saveConfig } from '../../core/config-manager.js';
import { createSkillRegistry } from '../../core/skill-registry.js';
import { CliError } from '../../utils/cli-error.js';
import { info } from '../../utils/logger.js';
import { parseSkillCategory } from '../../utils/validation.js';

function mergeUnique(existing: string[], additions: string[]): string[] {
  return [...new Set([...existing, ...additions])];
}

export async function runSkillInstallCommand(
  skillIds: string[],
  options: { category?: string },
  rootDir?: string,
): Promise<void> {
  const effectiveRootDir = rootDir ?? process.cwd();
  const registry = await createSkillRegistry(effectiveRootDir);
  const loaded = await loadConfig(effectiveRootDir).catch(() => {
    throw new CliError('Missing or invalid .magehub.yaml. Run `magehub setup:init` first.', 2);
  });

  const parsedCategory = parseSkillCategory(options.category);
  const categorySkillIds = parsedCategory !== undefined ? registry.list(parsedCategory).map((skill) => skill.id) : [];
  const targetIds = mergeUnique(skillIds, categorySkillIds);

  if (targetIds.length === 0) {
    throw new CliError('No skills specified for installation.', 1);
  }

  for (const skillId of targetIds) {
    if (registry.getById(skillId) === undefined) {
      throw new CliError(`Unknown skill ID: ${skillId}`, 3);
    }
  }

  const previous = new Set(loaded.config.skills);
  loaded.config.skills = mergeUnique(loaded.config.skills, targetIds);
  await saveConfig(effectiveRootDir, loaded.config);

  info('Updated .magehub.yaml');
  for (const skillId of targetIds) {
    info(`${previous.has(skillId) ? '•' : '✓'} ${skillId}`);
  }
}

export function registerSkillInstallCommand(program: Command): void {
  program
    .command('skill:install')
    .alias('install')
    .description('Install skills into .magehub.yaml')
    .argument('[skillIds...]', 'Skill identifiers to install')
    .option('--category <category>', 'Install all skills from a category')
    .action(async (skillIds: string[], options: { category?: string }) => runSkillInstallCommand(skillIds, options));
}
