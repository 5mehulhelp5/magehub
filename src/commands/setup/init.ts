import { readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';

import type { Command } from 'commander';

import {
  createDefaultConfig,
  loadConfig,
  resolveOutputPath,
  saveConfig,
} from '../../core/config-manager.js';
import { CliError } from '../../utils/cli-error.js';
import { pathExists } from '../../utils/fs.js';
import { info } from '../../utils/logger.js';
import { parseOutputFormat } from '../../utils/validation.js';

const GITIGNORE_HEADER = '# MageHub generated output';

async function updateGitignore(
  rootDir: string,
  outputPath: string,
): Promise<void> {
  const gitignorePath = path.join(rootDir, '.gitignore');
  const exists = await pathExists(gitignorePath);
  const relativePath = path.relative(rootDir, outputPath);

  if (exists) {
    const content = await readFile(gitignorePath, 'utf8');
    const lines = content.split('\n').map((l) => l.trim());
    if (lines.includes(relativePath)) {
      return;
    }
    const separator = content.endsWith('\n') ? '\n' : '\n\n';
    await writeFile(
      gitignorePath,
      `${content}${separator}${GITIGNORE_HEADER}\n${relativePath}\n`,
      'utf8',
    );
  } else {
    await writeFile(
      gitignorePath,
      `${GITIGNORE_HEADER}\n${relativePath}\n`,
      'utf8',
    );
  }

  info(`Updated .gitignore with ${relativePath}`);
}

export async function runSetupInitCommand(
  options: { format?: string; gitignore?: boolean },
  rootDir?: string,
): Promise<void> {
  const effectiveRootDir = rootDir ?? process.cwd();

  const existing = await loadConfig(effectiveRootDir).catch(
    (error: unknown) => {
      if (
        error instanceof Error &&
        'code' in error &&
        (error as NodeJS.ErrnoException).code === 'ENOENT'
      ) {
        return undefined;
      }

      if (error instanceof Error) {
        throw error;
      }

      throw new Error('Unknown config loading error');
    },
  );

  if (existing !== undefined) {
    throw new CliError('.magehub.yaml already exists', 2);
  }

  const config = createDefaultConfig();
  config.format = parseOutputFormat(options.format, config.format ?? 'claude');

  await saveConfig(effectiveRootDir, config);
  info('Created .magehub.yaml');

  if (options.gitignore !== false) {
    const outputPath = resolveOutputPath(effectiveRootDir, config.format);
    await updateGitignore(effectiveRootDir, outputPath);
  }

  info('MageHub initialized successfully!');
}

export function registerSetupInitCommand(program: Command): void {
  program
    .command('setup:init')
    .alias('init')
    .description('Initialize MageHub in the current project')
    .option('--format <format>', 'Default output format')
    .option('--no-gitignore', 'Skip updating .gitignore')
    .action(async (options: { format?: string; gitignore?: boolean }) =>
      runSetupInitCommand(options),
    );
}
