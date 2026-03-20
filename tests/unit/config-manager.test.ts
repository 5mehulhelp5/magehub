import path from 'node:path';
import { readFile, writeFile } from 'node:fs/promises';

import YAML from 'yaml';
import { beforeEach, describe, expect, it } from 'vitest';

import {
  createDefaultConfig,
  loadConfig,
  resolveCustomSkillsPath,
  resolveOutputPath,
  saveConfig,
  validateConfigFile,
} from '../../src/core/config-manager.js';
import { clearSchemaValidatorCache } from '../../src/core/schema-validator.js';
import {
  createFixtureRepo,
  makeConfigYaml,
  makeSkillYaml,
} from '../helpers/fixture.js';

describe('config-manager', () => {
  let rootDir: string;

  beforeEach(async () => {
    clearSchemaValidatorCache();
    rootDir = await createFixtureRepo({
      skills: [
        {
          category: 'module',
          id: 'module-test',
          yaml: makeSkillYaml({ id: 'module-test' }),
        },
      ],
      config: makeConfigYaml({ skills: ['module-test'], format: 'claude' }),
    });
  });

  describe('createDefaultConfig', () => {
    it('returns config with correct defaults', () => {
      const config = createDefaultConfig();

      expect(config.version).toBe('1');
      expect(config.skills).toEqual([]);
      expect(config.format).toBe('claude');
      expect(config.include_examples).toBe(true);
      expect(config.include_antipatterns).toBe(true);
    });
  });

  describe('resolveOutputPath', () => {
    it('resolves claude output to CLAUDE.md', () => {
      expect(resolveOutputPath('/project', 'claude')).toBe(
        path.join('/project', 'CLAUDE.md'),
      );
    });

    it('resolves codex output to AGENTS.md', () => {
      expect(resolveOutputPath('/project', 'codex')).toBe(
        path.join('/project', 'AGENTS.md'),
      );
    });

    it('resolves opencode output to .opencode/skills/magehub.md', () => {
      expect(resolveOutputPath('/project', 'opencode')).toBe(
        path.join('/project', '.opencode', 'skills', 'magehub.md'),
      );
    });

    it('resolves cursor output to .cursorrules', () => {
      expect(resolveOutputPath('/project', 'cursor')).toBe(
        path.join('/project', '.cursorrules'),
      );
    });

    it('resolves qoder output to .qoder/context.md', () => {
      expect(resolveOutputPath('/project', 'qoder')).toBe(
        path.join('/project', '.qoder', 'context.md'),
      );
    });

    it('resolves trae output to .trae/rules/magehub.md', () => {
      expect(resolveOutputPath('/project', 'trae')).toBe(
        path.join('/project', '.trae', 'rules', 'magehub.md'),
      );
    });

    it('resolves markdown output to MAGEHUB.md', () => {
      expect(resolveOutputPath('/project', 'markdown')).toBe(
        path.join('/project', 'MAGEHUB.md'),
      );
    });
  });

  describe('loadConfig', () => {
    it('loads a valid config file', async () => {
      const result = await loadConfig(rootDir);

      expect(result.config.version).toBe('1');
      expect(result.config.skills).toEqual(['module-test']);
      expect(result.config.format).toBe('claude');
      expect(result.filePath).toBe(path.join(rootDir, '.magehub.yaml'));
    });

    it('throws when config file does not exist', async () => {
      const emptyRoot = await createFixtureRepo();

      await expect(loadConfig(emptyRoot)).rejects.toThrow();
    });

    it('throws on invalid config (missing required fields)', async () => {
      await writeFile(
        path.join(rootDir, '.magehub.yaml'),
        'format: claude\n',
        'utf8',
      );

      await expect(loadConfig(rootDir)).rejects.toThrow('Invalid config file');
    });

    it('throws on config with invalid format value', async () => {
      await writeFile(
        path.join(rootDir, '.magehub.yaml'),
        'version: "1"\nskills: []\nformat: invalid-format\n',
        'utf8',
      );

      await expect(loadConfig(rootDir)).rejects.toThrow('Invalid config file');
    });
  });

  describe('validateConfigFile', () => {
    it('validates a valid config', async () => {
      const result = await validateConfigFile(rootDir);

      expect(result.valid).toBe(true);
      expect(result.errors).toEqual([]);
    });

    it('reports errors for invalid config', async () => {
      await writeFile(
        path.join(rootDir, '.magehub.yaml'),
        'version: "1"\nskills: "not-an-array"\n',
        'utf8',
      );

      const result = await validateConfigFile(rootDir);

      expect(result.valid).toBe(false);
      expect(result.errors.length).toBeGreaterThan(0);
    });
  });

  describe('saveConfig', () => {
    it('persists config to disk', async () => {
      const config = createDefaultConfig();
      config.skills = ['new-skill'];

      await saveConfig(rootDir, config);

      const content = await readFile(
        path.join(rootDir, '.magehub.yaml'),
        'utf8',
      );
      const parsed = YAML.parse(content) as { skills: string[] };
      expect(parsed.skills).toEqual(['new-skill']);
    });

    it('overwrites existing config', async () => {
      const config = createDefaultConfig();
      config.skills = ['a'];
      await saveConfig(rootDir, config);

      config.skills = ['b'];
      await saveConfig(rootDir, config);

      const result = await loadConfig(rootDir);
      expect(result.config.skills).toEqual(['b']);
    });
  });

  describe('resolveCustomSkillsPath', () => {
    it('resolves relative paths', () => {
      const config = createDefaultConfig();
      config.custom_skills_path = './custom-skills';

      expect(resolveCustomSkillsPath(rootDir, config)).toBe(
        path.join(rootDir, 'custom-skills'),
      );
    });

    it('returns undefined for undefined path', () => {
      const config = createDefaultConfig();

      expect(resolveCustomSkillsPath(rootDir, config)).toBeUndefined();
    });

    it('returns undefined for empty string path', () => {
      const config = createDefaultConfig();
      config.custom_skills_path = '';

      expect(resolveCustomSkillsPath(rootDir, config)).toBeUndefined();
    });

    it('returns undefined for whitespace-only path', () => {
      const config = createDefaultConfig();
      config.custom_skills_path = '   ';

      expect(resolveCustomSkillsPath(rootDir, config)).toBeUndefined();
    });

    it('rejects paths outside project root', () => {
      const config = createDefaultConfig();
      config.custom_skills_path = '../outside';

      expect(() => resolveCustomSkillsPath(rootDir, config)).toThrow(
        'custom_skills_path must stay within the project root',
      );
    });

    it('rejects absolute paths outside project', () => {
      const config = createDefaultConfig();
      config.custom_skills_path = '/tmp/elsewhere';

      expect(() => resolveCustomSkillsPath(rootDir, config)).toThrow(
        'custom_skills_path must stay within the project root',
      );
    });
  });
});
