import type { Command } from 'commander';

import { loadConfig } from '../../core/config-manager.js';
import { renderConfig } from '../../core/renderer.js';
import { CliError } from '../../utils/cli-error.js';

export async function runConfigShowCommand(rootDir?: string): Promise<void> {
  const loaded = await loadConfig(rootDir ?? process.cwd()).catch(() => {
    throw new CliError('Missing or invalid .magehub.yaml. Run `magehub setup:init` first.', 2);
  });

  console.log(renderConfig(loaded.config));
}

export function registerConfigShowCommand(program: Command): void {
  program
    .command('config:show')
    .alias('config')
    .description('Display current configuration')
    .action(async () => runConfigShowCommand());
}
