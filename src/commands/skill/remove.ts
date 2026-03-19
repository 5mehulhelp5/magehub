import type { Command } from 'commander';

import { loadConfig, saveConfig } from '../../core/config-manager.js';
import { CliError } from '../../utils/cli-error.js';
import { info } from '../../utils/logger.js';

export async function runSkillRemoveCommand(skillIds: string[], rootDir?: string): Promise<void> {
  const effectiveRootDir = rootDir ?? process.cwd();
  const loaded = await loadConfig(effectiveRootDir).catch(() => {
    throw new CliError('Missing or invalid .magehub.yaml. Run `magehub setup:init` first.', 2);
  });

  if (skillIds.length === 0) {
    throw new CliError('No skills specified for removal.', 1);
  }

  const existing = new Set(loaded.config.skills);
  const missing = skillIds.filter((skillId) => !existing.has(skillId));
  if (missing.length > 0) {
    throw new CliError(`Skills not installed: ${missing.join(', ')}`, 1);
  }

  loaded.config.skills = loaded.config.skills.filter((skillId) => !skillIds.includes(skillId));
  await saveConfig(effectiveRootDir, loaded.config);

  info('Updated .magehub.yaml');
  for (const skillId of skillIds) {
    info(`✓ ${skillId}`);
  }
}

export function registerSkillRemoveCommand(program: Command): void {
  program
    .command('skill:remove')
    .alias('remove')
    .description('Remove skills from .magehub.yaml')
    .argument('<skillIds...>', 'Skill identifiers to remove')
    .action(async (skillIds: string[]) => runSkillRemoveCommand(skillIds));
}
