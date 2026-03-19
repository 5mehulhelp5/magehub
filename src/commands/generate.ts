import type { Command } from 'commander';

import { writeUtf8 } from '../utils/fs.js';
import { CliError } from '../utils/cli-error.js';
import { info } from '../utils/logger.js';
import { loadConfig, resolveOutputPath } from '../core/config-manager.js';
import { renderGeneratedOutput } from '../core/renderer.js';
import { createSkillRegistry } from '../core/skill-registry.js';
import { parseOutputFormat } from '../utils/validation.js';

export async function runGenerateCommand(
  options: {
    format?: string;
    output?: string;
    skills?: string;
    examples?: boolean;
    antipatterns?: boolean;
  },
  rootDir?: string,
): Promise<void> {
  const effectiveRootDir = rootDir ?? process.cwd();
  const loaded = await loadConfig(effectiveRootDir).catch(() => {
    throw new CliError('Missing or invalid .magehub.yaml. Run `magehub setup:init` first.', 2);
  });
  const registry = await createSkillRegistry(effectiveRootDir);

  const format = parseOutputFormat(options.format, loaded.config.format ?? 'claude');
  const selectedSkillIds = options.skills?.split(',').map((value) => value.trim()).filter(Boolean) ?? loaded.config.skills;

  if (selectedSkillIds.length === 0) {
    throw new CliError('No skills configured for generation.', 1);
  }

  const skills = selectedSkillIds.map((skillId) => {
    const skill = registry.getById(skillId);
    if (skill === undefined) {
      throw new CliError(`Unknown skill ID: ${skillId}`, 3);
    }
    const compatibilityFormat = format === 'markdown' ? undefined : format;
    if (
      compatibilityFormat !== undefined &&
      skill.compatibility !== undefined &&
      !skill.compatibility.includes(compatibilityFormat)
    ) {
      throw new CliError(`Skill ${skillId} is not compatible with format ${format}`, 3);
    }
    return skill;
  });

  const outputPath = options.output ?? loaded.config.output ?? resolveOutputPath(effectiveRootDir, format);
  const output = await renderGeneratedOutput(skills, {
    format,
    includeExamples: options.examples ?? loaded.config.include_examples ?? true,
    includeAntipatterns: options.antipatterns ?? loaded.config.include_antipatterns ?? true,
    rootDir: effectiveRootDir,
  });

  await writeUtf8(outputPath, output);
  info(`Generated: ${outputPath}`);
}

export function registerGenerateCommand(program: Command): void {
  program
    .command('generate')
    .alias('gen')
    .description('Generate a context file for an AI tool')
    .option('--format <format>', 'Output format override')
    .option('--output <path>', 'Output file path')
    .option('--skills <ids>', 'Comma-separated skill IDs')
    .option('--no-examples', 'Exclude code examples')
    .option('--no-antipatterns', 'Exclude anti-patterns')
    .action(
      async (options: {
        format?: string;
        output?: string;
        skills?: string;
        examples?: boolean;
        antipatterns?: boolean;
      }) => {
        await runGenerateCommand(options);
      },
    );
}
