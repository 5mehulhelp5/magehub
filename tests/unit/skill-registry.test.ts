import { beforeEach, describe, expect, it } from 'vitest';

import {
  SkillRegistry,
  createSkillRegistry,
  deriveSkillIdFromPath,
} from '../../src/core/skill-registry.js';
import { clearSchemaValidatorCache } from '../../src/core/schema-validator.js';
import type { LoadedSkill } from '../../src/core/skill-loader.js';
import type { Skill } from '../../src/types/skill.js';
import {
  createFixtureRepo,
  makeConfigYaml,
  makeSkillYaml,
} from '../helpers/fixture.js';

function makeLoadedSkill(
  overrides: Partial<Skill> & { id: string },
  filePath?: string,
): LoadedSkill {
  const { id, ...rest } = overrides;
  return {
    filePath: filePath ?? `/skills/module/${id}/skill.yaml`,
    skill: {
      id,
      name: rest.name ?? id,
      version: rest.version ?? '1.0.0',
      category: rest.category ?? 'module',
      description: rest.description ?? 'Test',
      instructions: rest.instructions ?? '### Test\n\nContent.',
      ...rest,
    } as Skill,
  };
}

describe('SkillRegistry', () => {
  describe('constructor', () => {
    it('sorts entries by skill ID', () => {
      const registry = new SkillRegistry([
        makeLoadedSkill({ id: 'zzz' }),
        makeLoadedSkill({ id: 'aaa' }),
        makeLoadedSkill({ id: 'mmm' }),
      ]);

      const ids = registry.list().map((s) => s.id);
      expect(ids).toEqual(['aaa', 'mmm', 'zzz']);
    });

    it('throws on duplicate skill IDs', () => {
      expect(
        () =>
          new SkillRegistry([
            makeLoadedSkill({ id: 'duplicate' }),
            makeLoadedSkill({ id: 'duplicate' }),
          ]),
      ).toThrow('Duplicate skill ID detected: duplicate');
    });

    it('accepts empty entries', () => {
      const registry = new SkillRegistry([]);
      expect(registry.list()).toEqual([]);
    });
  });

  describe('list', () => {
    it('lists all skills when no category filter', () => {
      const registry = new SkillRegistry([
        makeLoadedSkill({ id: 'a', category: 'module' }),
        makeLoadedSkill({ id: 'b', category: 'testing' }),
      ]);

      expect(registry.list()).toHaveLength(2);
    });

    it('filters by category', () => {
      const registry = new SkillRegistry([
        makeLoadedSkill({ id: 'a', category: 'module' }),
        makeLoadedSkill({ id: 'b', category: 'testing' }),
        makeLoadedSkill({ id: 'c', category: 'module' }),
      ]);

      const moduleSkills = registry.list('module');
      expect(moduleSkills).toHaveLength(2);
      expect(moduleSkills.every((s) => s.category === 'module')).toBe(true);
    });

    it('returns empty array for unmatched category', () => {
      const registry = new SkillRegistry([
        makeLoadedSkill({ id: 'a', category: 'module' }),
      ]);

      expect(registry.list('testing')).toEqual([]);
    });
  });

  describe('search', () => {
    it('searches by skill ID', () => {
      const registry = new SkillRegistry([
        makeLoadedSkill({ id: 'module-scaffold', name: 'Scaffold' }),
        makeLoadedSkill({ id: 'module-plugin', name: 'Plugin' }),
      ]);

      expect(registry.search('scaffold')).toHaveLength(1);
      expect(registry.search('scaffold')[0].id).toBe('module-scaffold');
    });

    it('searches by name', () => {
      const registry = new SkillRegistry([
        makeLoadedSkill({ id: 'a', name: 'Plugin Development' }),
        makeLoadedSkill({ id: 'b', name: 'Testing Framework' }),
      ]);

      expect(registry.search('Plugin')).toHaveLength(1);
    });

    it('searches by description', () => {
      const registry = new SkillRegistry([
        makeLoadedSkill({ id: 'a', description: 'Handle GraphQL resolvers' }),
        makeLoadedSkill({ id: 'b', description: 'Module scaffolding' }),
      ]);

      expect(registry.search('graphql')).toHaveLength(1);
    });

    it('searches by tags', () => {
      const registry = new SkillRegistry([
        makeLoadedSkill({ id: 'a', tags: ['caching', 'redis'] }),
        makeLoadedSkill({ id: 'b', tags: ['testing'] }),
      ]);

      expect(registry.search('redis')).toHaveLength(1);
    });

    it('is case insensitive', () => {
      const registry = new SkillRegistry([
        makeLoadedSkill({ id: 'module-plugin', name: 'Plugin Development' }),
      ]);

      expect(registry.search('PLUGIN')).toHaveLength(1);
      expect(registry.search('plugin')).toHaveLength(1);
    });

    it('filters by category during search', () => {
      const registry = new SkillRegistry([
        makeLoadedSkill({
          id: 'module-test',
          name: 'Test Module',
          category: 'module',
        }),
        makeLoadedSkill({
          id: 'testing-test',
          name: 'Test Framework',
          category: 'testing',
        }),
      ]);

      const results = registry.search('test', 'module');
      expect(results).toHaveLength(1);
      expect(results[0].category).toBe('module');
    });

    it('returns empty for no matches', () => {
      const registry = new SkillRegistry([makeLoadedSkill({ id: 'a' })]);

      expect(registry.search('nonexistent')).toEqual([]);
    });
  });

  describe('getById', () => {
    it('returns skill by ID', () => {
      const registry = new SkillRegistry([
        makeLoadedSkill({ id: 'target', name: 'Target' }),
      ]);

      expect(registry.getById('target')?.name).toBe('Target');
    });

    it('returns undefined for unknown ID', () => {
      const registry = new SkillRegistry([makeLoadedSkill({ id: 'a' })]);

      expect(registry.getById('unknown')).toBeUndefined();
    });
  });

  describe('getFilePath', () => {
    it('returns file path for known skill', () => {
      const registry = new SkillRegistry([
        makeLoadedSkill({ id: 'a' }, '/custom/path/skill.yaml'),
      ]);

      expect(registry.getFilePath('a')).toBe('/custom/path/skill.yaml');
    });

    it('returns undefined for unknown skill', () => {
      const registry = new SkillRegistry([]);

      expect(registry.getFilePath('unknown')).toBeUndefined();
    });
  });
});

describe('createSkillRegistry', () => {
  let rootDir: string;

  beforeEach(async () => {
    clearSchemaValidatorCache();
    rootDir = await createFixtureRepo({
      skills: [
        {
          category: 'module',
          id: 'module-alpha',
          yaml: makeSkillYaml({ id: 'module-alpha' }),
        },
        {
          category: 'testing',
          id: 'testing-beta',
          yaml: makeSkillYaml({ id: 'testing-beta', category: 'testing' }),
        },
      ],
      config: makeConfigYaml({ skills: ['module-alpha'] }),
    });
  });

  it('loads skills from bundled directory', async () => {
    const registry = await createSkillRegistry(rootDir);

    expect(registry.list()).toHaveLength(2);
  });

  it('works without a config file', async () => {
    const noConfigRoot = await createFixtureRepo({
      skills: [
        {
          category: 'module',
          id: 'module-only',
          yaml: makeSkillYaml({ id: 'module-only' }),
        },
      ],
    });

    const registry = await createSkillRegistry(noConfigRoot);

    expect(registry.list()).toHaveLength(1);
  });
});

describe('deriveSkillIdFromPath', () => {
  it('extracts skill ID from directory-based path', () => {
    expect(
      deriveSkillIdFromPath('/skills/module/module-scaffold/skill.yaml'),
    ).toBe('module-scaffold');
  });
});
