import { mkdtemp, mkdir, writeFile } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';

import { readFile } from 'node:fs/promises';

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { loadConfig, resolveCustomSkillsPath, validateConfigFile } from '../src/core/config-manager.js';
import { clearSchemaValidatorCache } from '../src/core/schema-validator.js';
import { createSkillRegistry } from '../src/core/skill-registry.js';
import { validateSkillFile } from '../src/core/skill-validator.js';
import { runGenerateCommand } from '../src/commands/generate.js';
import { runConfigValidateCommand } from '../src/commands/config/validate.js';
import { runConfigShowCommand } from '../src/commands/config/show.js';
import { runSetupInitCommand } from '../src/commands/setup/init.js';
import { runSkillInstallCommand } from '../src/commands/skill/install.js';
import { runSkillListCommand } from '../src/commands/skill/list.js';
import { runSkillRemoveCommand } from '../src/commands/skill/remove.js';
import { runSkillSearchCommand } from '../src/commands/skill/search.js';
import { runSkillShowCommand } from '../src/commands/skill/show.js';
import { runSkillVerifyCommand } from '../src/commands/skill/verify.js';

async function setupFixtureRepo(): Promise<string> {
  const rootDir = await mkdtemp(path.join(os.tmpdir(), 'magehub-'));

  await mkdir(path.join(rootDir, 'schema'), { recursive: true });
  await mkdir(path.join(rootDir, 'skills', 'module', 'module-plugin'), { recursive: true });
  await mkdir(path.join(rootDir, 'templates'), { recursive: true });

  await writeFile(
    path.join(rootDir, 'schema', 'skill.schema.json'),
    JSON.stringify({
      $schema: 'http://json-schema.org/draft-07/schema#',
      type: 'object',
      required: ['id', 'name', 'version', 'category', 'description', 'instructions'],
      properties: {
        id: { type: 'string' },
        name: { type: 'string' },
        version: { type: 'string' },
        category: { type: 'string', enum: ['module'] },
        description: { type: 'string' },
        instructions: { type: 'string' },
        tags: { type: 'array', items: { type: 'string' } },
        magento_versions: { type: 'array', items: { type: 'string' } },
        conventions: {
          type: 'array',
          items: {
            type: 'object',
            required: ['rule'],
            properties: { rule: { type: 'string' }, rationale: { type: 'string' } },
            additionalProperties: false,
          },
        },
        examples: {
          type: 'array',
          items: {
            type: 'object',
            required: ['title', 'code'],
            properties: { title: { type: 'string' }, code: { type: 'string' }, language: { type: 'string' } },
            additionalProperties: false,
          },
        },
        anti_patterns: {
          type: 'array',
          items: {
            type: 'object',
            required: ['pattern', 'problem'],
            properties: { pattern: { type: 'string' }, problem: { type: 'string' } },
            additionalProperties: false,
          },
        },
        references: {
          type: 'array',
          items: {
            type: 'object',
            required: ['title', 'url'],
            properties: { title: { type: 'string' }, url: { type: 'string' } },
            additionalProperties: false,
          },
        },
        compatibility: {
          type: 'array',
          items: { type: 'string' },
        },
      },
      additionalProperties: false,
    }),
    'utf8',
  );

  await writeFile(
    path.join(rootDir, 'schema', 'config.schema.json'),
    JSON.stringify({
      $schema: 'http://json-schema.org/draft-07/schema#',
      type: 'object',
      required: ['version', 'skills'],
      properties: {
        version: { type: 'string' },
        skills: { type: 'array', items: { type: 'string' } },
        format: { type: 'string' },
      },
      additionalProperties: false,
    }),
    'utf8',
  );

  await writeFile(
    path.join(rootDir, 'skills', 'module', 'module-plugin', 'skill.yaml'),
    [
      'id: module-plugin',
      'name: Plugin Development',
      'version: "1.0.0"',
      'category: module',
      'description: Implement Magento 2 plugins',
      'tags:',
      '  - plugin',
      'instructions: |',
      '  ### Plugin Development',
      '',
      '  Use plugins carefully.',
      'conventions:',
      '  - rule: Prefer before plugins when possible',
      'examples:',
      '  - title: XML declaration',
      '    language: xml',
      '    code: |',
      '      <type name="Magento\\Catalog\\Model\\Product"></type>',
      'anti_patterns:',
      '  - pattern: Plugin on __construct',
      '    problem: Not supported',
      'references:',
      '  - title: Adobe Docs',
      '    url: https://example.com',
      'compatibility:',
      '  - claude',
    ].join('\n'),
    'utf8',
  );

  await writeFile(
    path.join(rootDir, '.magehub.yaml'),
    ['version: "1"', 'skills:', '  - module-plugin', 'format: claude'].join('\n'),
    'utf8',
  );

  await writeFile(
    path.join(rootDir, 'templates', 'claude.hbs'),
    ['# MageHub Context', '', '{{content}}'].join('\n'),
    'utf8',
  );

  return rootDir;
}

describe('core services and commands', () => {
  let rootDir: string;
  let logSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(async () => {
    clearSchemaValidatorCache();
    rootDir = await setupFixtureRepo();
    logSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
  });

  afterEach(() => {
    logSpy.mockRestore();
  });

  it('loads and indexes bundled skills', async () => {
    const registry = await createSkillRegistry(rootDir);

    expect(registry.list()).toHaveLength(1);
    expect(registry.getById('module-plugin')?.name).toBe('Plugin Development');
  });

  it('resolves custom skills path from config', async () => {
    const loaded = await loadConfig(rootDir);
    loaded.config.custom_skills_path = './custom-skills';

    expect(resolveCustomSkillsPath(rootDir, loaded.config)).toBe(path.join(rootDir, 'custom-skills'));
  });

  it('rejects custom skills paths outside the project root', async () => {
    const loaded = await loadConfig(rootDir);
    loaded.config.custom_skills_path = '../outside';

    expect(() => resolveCustomSkillsPath(rootDir, loaded.config)).toThrow(
      'custom_skills_path must stay within the project root',
    );
  });

  it('validates config files', async () => {
    const result = await validateConfigFile(rootDir);
    expect(result.valid).toBe(true);

    const loaded = await loadConfig(rootDir);
    expect(loaded.config.skills).toEqual(['module-plugin']);
  });

  it('validates skill files and reports no warnings for ### headings', async () => {
    const result = await validateSkillFile(
      path.join(rootDir, 'skills', 'module', 'module-plugin', 'skill.yaml'),
      rootDir,
    );

    expect(result.valid).toBe(true);
    expect(result.warnings).toEqual([]);
  });

  it('runs skill:list against the registry', async () => {
    await runSkillListCommand({ format: 'table', rootDir });
    expect(logSpy).toHaveBeenCalledWith(expect.stringContaining('module-plugin'));
  });

  it('runs skill:show against the registry', async () => {
    await runSkillShowCommand('module-plugin', rootDir);
    expect(logSpy).toHaveBeenCalledWith(expect.stringContaining('module-plugin v1.0.0'));
  });

  it('runs skill:search against the registry', async () => {
    await runSkillSearchCommand('plugin', {}, rootDir);
    expect(logSpy).toHaveBeenCalledWith(expect.stringContaining('Search results for "plugin"'));
  });

  it('runs skill:verify for installed skills', async () => {
    await runSkillVerifyCommand({}, rootDir);
    expect(logSpy).toHaveBeenCalledWith(expect.stringContaining('schema OK'));
  });

  it('runs config:validate successfully', async () => {
    await runConfigValidateCommand(rootDir);
    expect(logSpy).toHaveBeenCalledWith(expect.stringContaining('.magehub.yaml is valid'));
  });

  it('runs config:show successfully', async () => {
    await runConfigShowCommand(rootDir);
    expect(logSpy).toHaveBeenCalledWith(expect.stringContaining('"skills"'));
  });

  it('installs and removes skills in config', async () => {
    await runSkillInstallCommand(['module-plugin'], {}, rootDir);
    await runSkillRemoveCommand(['module-plugin'], rootDir);

    const loaded = await loadConfig(rootDir);
    expect(loaded.config.skills).toEqual([]);
  });

  it('rejects removing skills that are not installed', async () => {
    await expect(runSkillRemoveCommand(['missing-skill'], rootDir)).rejects.toThrow('Skills not installed');
  });

  it('generates output from config and templates', async () => {
    const outputPath = path.join(rootDir, 'CLAUDE.md');
    await runGenerateCommand({}, rootDir);

    const content = await readFile(outputPath, 'utf8');
    expect(content).toContain('# MageHub Context');
    expect(content).toContain('## Plugin Development (module-plugin)');
  });

  it('creates a default config during setup:init', async () => {
    const otherRoot = await mkdtemp(path.join(os.tmpdir(), 'magehub-init-'));
    await mkdir(path.join(otherRoot, 'schema'), { recursive: true });
    await writeFile(
      path.join(otherRoot, 'schema', 'config.schema.json'),
      JSON.stringify({
        $schema: 'http://json-schema.org/draft-07/schema#',
        type: 'object',
        required: ['version', 'skills'],
        properties: {
          version: { type: 'string' },
          skills: { type: 'array', items: { type: 'string' } },
          format: { type: 'string' },
          include_examples: { type: 'boolean' },
          include_antipatterns: { type: 'boolean' },
        },
        additionalProperties: false,
      }),
      'utf8',
    );

    await runSetupInitCommand({ format: 'claude' }, otherRoot);
    const content = await readFile(path.join(otherRoot, '.magehub.yaml'), 'utf8');
    expect(content).toContain('version: "1"');
  });

  it('rejects unsupported output formats during generation setup', async () => {
    await expect(runSetupInitCommand({ format: 'bad-format' }, rootDir)).rejects.toThrow('already exists');
    await expect(runGenerateCommand({ format: 'bad-format' }, rootDir)).rejects.toThrow('Unsupported output format');
  });
});
