import type { Command } from 'commander';

import { createSkillRegistry } from '../../core/skill-registry.js';
import { CliError } from '../../utils/cli-error.js';

export async function runSkillShowCommand(skillId: string, rootDir?: string): Promise<void> {
  const registry = await createSkillRegistry(rootDir ?? process.cwd());
  const skill = registry.getById(skillId);

  if (skill === undefined) {
    throw new CliError(`Unknown skill ID: ${skillId}`, 3);
  }

  console.log(`${skill.id} v${skill.version}`);
  console.log(`Category: ${skill.category}`);
  console.log(`Description: ${skill.description}`);

  if ((skill.tags?.length ?? 0) > 0) {
    console.log(`Tags: ${(skill.tags ?? []).join(', ')}`);
  }

  if ((skill.magento_versions?.length ?? 0) > 0) {
    console.log(`Magento: ${(skill.magento_versions ?? []).join(', ')}`);
  }

  console.log(`Conventions: ${skill.conventions?.length ?? 0}`);
  console.log(`Examples: ${skill.examples?.length ?? 0}`);
  console.log(`Anti-patterns: ${skill.anti_patterns?.length ?? 0}`);
  console.log(`References: ${skill.references?.length ?? 0}`);
}

export function registerSkillShowCommand(program: Command): void {
  program
    .command('skill:show')
    .alias('show')
    .description('Show detailed skill information')
    .argument('<skillId>', 'Skill identifier')
    .action(async (skillId: string) => runSkillShowCommand(skillId));
}
