import type { Command } from 'commander';

import { createDefaultConfig, loadConfig, saveConfig } from '../../core/config-manager.js';
import { CliError } from '../../utils/cli-error.js';
import { info } from '../../utils/logger.js';
import { parseOutputFormat } from '../../utils/validation.js';

export async function runSetupInitCommand(
  options: { format?: string },
  rootDir?: string,
): Promise<void> {
  const effectiveRootDir = rootDir ?? process.cwd();

  const existing = await loadConfig(effectiveRootDir).catch((error: unknown) => {
    const nodeError = error as NodeJS.ErrnoException;
    if (nodeError.code === 'ENOENT') {
      return undefined;
    }

    if (error instanceof Error) {
      throw error;
    }

    throw new Error('Unknown config loading error');
  });

  if (existing !== undefined) {
    throw new CliError('.magehub.yaml already exists', 2);
  }

  const config = createDefaultConfig();
  config.format = parseOutputFormat(options.format, config.format ?? 'claude');

  await saveConfig(effectiveRootDir, config);
  info('Created .magehub.yaml');
  info('MageHub initialized successfully!');
}

export function registerSetupInitCommand(program: Command): void {
  program
    .command('setup:init')
    .alias('init')
    .description('Initialize MageHub in the current project')
    .option('--format <format>', 'Default output format')
    .action(async (options: { format?: string }) => runSetupInitCommand(options));
}
