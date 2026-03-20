import type { Command } from 'commander';

import { validateConfigFile } from '../../core/config-manager.js';
import { CliError } from '../../utils/cli-error.js';
import { info } from '../../utils/logger.js';

export async function runConfigValidateCommand(
  rootDir?: string,
): Promise<void> {
  const result = await validateConfigFile(rootDir ?? process.cwd()).catch(
    (error: unknown) => {
      const detail = error instanceof Error ? `: ${error.message}` : '';
      throw new CliError(
        `Missing or invalid .magehub.yaml${detail}. Run \`magehub setup:init\` first.`,
        2,
      );
    },
  );

  if (!result.valid) {
    throw new CliError(
      `Config validation failed: ${result.errors.join('; ')}`,
      2,
    );
  }

  info('.magehub.yaml is valid');
}

export function registerConfigValidateCommand(program: Command): void {
  program
    .command('config:validate')
    .alias('validate')
    .description('Validate .magehub.yaml against the configuration schema')
    .action(async () => runConfigValidateCommand());
}
