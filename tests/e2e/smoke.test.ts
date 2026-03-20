import { readFile, mkdir, mkdtemp, writeFile, cp, rm } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import os from 'node:os';
import path from 'node:path';

import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest';

import { runSetupInitCommand } from '../../src/commands/setup/init.js';
import { runSkillInstallCommand } from '../../src/commands/skill/install.js';
import { runGenerateCommand } from '../../src/commands/generate.js';
import { resolveOutputPath } from '../../src/core/config-manager.js';
import { clearSchemaValidatorCache } from '../../src/core/schema-validator.js';
import { PROJECT_ROOT } from '../helpers/fixture.js';
import { parseFrontMatter } from '../helpers/front-matter.js';
import {
  assertNoUnresolvedPlaceholders,
  assertHeadingHierarchy,
  assertFencedCodeBlocks,
  assertMagentoDomainTerms,
  assertSkillSeparators,
  assertCursorFrontMatter,
  assertQoderFrontMatter,
  assertTraeFrontMatter,
  assertNoFrontMatter,
} from '../helpers/output-validators.js';
import {
  generateSmokeReport,
  type FormatResult,
} from '../helpers/smoke-report.js';

// All 7 supported formats
const ALL_FORMATS = [
  'claude',
  'opencode',
  'cursor',
  'codex',
  'qoder',
  'trae',
  'markdown',
] as const;

// All 10 bundled skill IDs (sorted alphabetically as the registry returns them)
const ALL_SKILL_IDS = [
  'admin-ui-grid',
  'api-graphql-resolver',
  'hyva-module-compatibility',
  'module-di',
  'module-plugin',
  'module-scaffold',
  'module-setup',
  'performance-caching',
  'standards-coding',
  'testing-phpunit',
];

// Formats that use YAML front-matter
const FRONT_MATTER_FORMATS: Record<string, (content: string) => void> = {
  cursor: assertCursorFrontMatter,
  qoder: assertQoderFrontMatter,
  trae: assertTraeFrontMatter,
};

// Minimum expected output size for 10 skills (bytes)
const MIN_OUTPUT_SIZE = 1024;

describe('E2E smoke test — full lifecycle against simulated Magento 2 project', () => {
  let rootDir: string;
  const outputs = new Map<string, { content: string; outputPath: string }>();

  beforeAll(async () => {
    clearSchemaValidatorCache();

    // Create a temp directory simulating a Magento 2 project
    rootDir = await mkdtemp(path.join(os.tmpdir(), 'magehub-smoke-'));

    // Create Magento 2 marker files
    await mkdir(path.join(rootDir, 'app', 'etc'), { recursive: true });
    await writeFile(
      path.join(rootDir, 'composer.json'),
      JSON.stringify({
        name: 'magento/project-community-edition',
        type: 'project',
        require: { 'magento/product-community-edition': '2.4.7' },
      }),
      'utf8',
    );
    await writeFile(
      path.join(rootDir, 'app', 'etc', 'env.php'),
      "<?php\nreturn ['db' => ['host' => 'localhost']];",
      'utf8',
    );
    await writeFile(
      path.join(rootDir, 'app', 'etc', 'di.xml'),
      '<config xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance"/>',
      'utf8',
    );

    // Copy real bundled skills
    await cp(path.join(PROJECT_ROOT, 'skills'), path.join(rootDir, 'skills'), {
      recursive: true,
    });

    // Copy real schemas (needed for config validation during loadConfig)
    await mkdir(path.join(rootDir, 'schema'), { recursive: true });
    await cp(
      path.join(PROJECT_ROOT, 'schema', 'skill.schema.json'),
      path.join(rootDir, 'schema', 'skill.schema.json'),
    );
    await cp(
      path.join(PROJECT_ROOT, 'schema', 'config.schema.json'),
      path.join(rootDir, 'schema', 'config.schema.json'),
    );

    // Suppress console.log during setup
    const logSpy = vi.spyOn(console, 'log').mockImplementation(() => {});

    // 1. Initialize MageHub
    await runSetupInitCommand({ format: 'claude' }, rootDir);

    // 2. Install all 10 skills
    await runSkillInstallCommand(ALL_SKILL_IDS, {}, rootDir);

    // 3. Generate output for all 7 formats
    for (const format of ALL_FORMATS) {
      clearSchemaValidatorCache();
      const outputPath = resolveOutputPath(rootDir, format);
      await runGenerateCommand({ format }, rootDir);
      const content = await readFile(outputPath, 'utf8');
      outputs.set(format, { content, outputPath });
    }

    logSpy.mockRestore();
  });

  afterAll(async () => {
    // Generate the smoke report
    const reportResults: FormatResult[] = [];
    for (const format of ALL_FORMATS) {
      const result = outputs.get(format);
      if (result !== undefined) {
        const { body } = parseFrontMatter(result.content);
        const h2Count = (body.match(/^## /gm) ?? []).length;
        reportResults.push({
          format,
          outputPath: path.relative(rootDir, result.outputPath),
          content: result.content,
          fileSize: Buffer.byteLength(result.content, 'utf8'),
          skillCount: h2Count,
          hasFrontMatter:
            Object.keys(parseFrontMatter(result.content).data).length > 0,
        });
      }
    }

    if (reportResults.length > 0) {
      await generateSmokeReport(reportResults);
    }

    // Cleanup
    await rm(rootDir, { recursive: true, force: true });
  });

  it('initializes in a simulated Magento 2 project directory', () => {
    // Verify Magento marker files exist
    expect(existsSync(path.join(rootDir, 'composer.json'))).toBe(true);
    expect(existsSync(path.join(rootDir, 'app', 'etc', 'env.php'))).toBe(true);
    expect(existsSync(path.join(rootDir, 'app', 'etc', 'di.xml'))).toBe(true);

    // Verify .magehub.yaml was created and contains all skills
    expect(existsSync(path.join(rootDir, '.magehub.yaml'))).toBe(true);
  });

  it('installs all 10 bundled skills into config', async () => {
    const configContent = await readFile(
      path.join(rootDir, '.magehub.yaml'),
      'utf8',
    );
    for (const skillId of ALL_SKILL_IDS) {
      expect(configContent, `Expected skill "${skillId}" in config`).toContain(
        skillId,
      );
    }
  });

  describe.each(ALL_FORMATS)('format: %s', (format) => {
    it('generates a non-empty output file of reasonable size', () => {
      const result = outputs.get(format);
      expect(result, `No output captured for format ${format}`).toBeDefined();
      const size = Buffer.byteLength(result!.content, 'utf8');
      expect(
        size,
        `Output for ${format} should be at least ${MIN_OUTPUT_SIZE} bytes`,
      ).toBeGreaterThanOrEqual(MIN_OUTPUT_SIZE);
    });

    it('writes output to the correct default path', () => {
      const result = outputs.get(format);
      expect(result).toBeDefined();
      expect(existsSync(result!.outputPath)).toBe(true);
    });

    it('contains no unresolved Handlebars placeholders', () => {
      const result = outputs.get(format);
      expect(result).toBeDefined();
      assertNoUnresolvedPlaceholders(result!.content);
    });

    it('has correct heading hierarchy with all 10 skill sections', () => {
      const result = outputs.get(format);
      expect(result).toBeDefined();
      assertHeadingHierarchy(result!.content, ALL_SKILL_IDS.length);
    });

    it('contains fenced code blocks with language tags', () => {
      const result = outputs.get(format);
      expect(result).toBeDefined();
      assertFencedCodeBlocks(result!.content);
    });

    it('includes Magento-specific domain terms', () => {
      const result = outputs.get(format);
      expect(result).toBeDefined();
      assertMagentoDomainTerms(result!.content);
    });

    it('has skill section separators', () => {
      const result = outputs.get(format);
      expect(result).toBeDefined();
      assertSkillSeparators(result!.content, ALL_SKILL_IDS.length);
    });

    it('has correct front-matter (or none) for the format', () => {
      const result = outputs.get(format);
      expect(result).toBeDefined();
      const validator = FRONT_MATTER_FORMATS[format];
      if (validator !== undefined) {
        validator(result!.content);
      } else {
        assertNoFrontMatter(result!.content);
      }
    });
  });
});
