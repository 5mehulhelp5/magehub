import { beforeEach, describe, expect, it } from 'vitest';

import { renderGeneratedOutput } from '../../src/core/renderer.js';
import { clearSchemaValidatorCache } from '../../src/core/schema-validator.js';
import type { Skill } from '../../src/types/skill.js';
import type { OutputFormat } from '../../src/types/config.js';
import { PROJECT_ROOT } from '../helpers/fixture.js';

function makeSkill(overrides: Partial<Skill> = {}): Skill {
  return {
    id: 'module-plugin',
    name: 'Plugin Development',
    version: '1.0.0',
    category: 'module',
    description: 'Implement Magento 2 plugins correctly',
    tags: ['plugin', 'interception'],
    magento_versions: ['2.4.x'],
    instructions:
      '### Plugin System\n\nUse the Magento 2 interceptor pattern to extend behavior.',
    conventions: [
      { rule: 'Prefer before plugins over after plugins when possible' },
      { rule: 'Never plugin on __construct methods' },
    ],
    examples: [
      {
        title: 'Plugin di.xml Declaration',
        code: '<type name="Magento\\Catalog\\Model\\Product">\n  <plugin name="vendor_module_product" type="Vendor\\Module\\Plugin\\ProductPlugin" />\n</type>',
        language: 'xml',
      },
      {
        title: 'After Plugin Method',
        code: "public function afterGetName(\n    \\Magento\\Catalog\\Model\\Product $subject,\n    string $result\n): string {\n    return $result . ' (Modified)';\n}",
        language: 'php',
      },
    ],
    anti_patterns: [
      {
        pattern: 'Plugin on __construct',
        problem: 'Constructor plugins are not supported by Magento',
      },
      {
        pattern: 'Plugin on final methods',
        problem: 'Final methods cannot be intercepted',
      },
    ],
    references: [
      {
        title: 'Adobe Developer Docs — Plugins',
        url: 'https://developer.adobe.com/commerce/php/development/components/plugins/',
      },
    ],
    compatibility: ['claude', 'opencode', 'cursor', 'codex', 'qoder', 'trae'],
    ...overrides,
  };
}

const twoSkills: Skill[] = [
  makeSkill(),
  {
    id: 'testing-phpunit',
    name: 'PHPUnit Testing',
    version: '1.0.0',
    category: 'testing',
    description: 'Write PHPUnit tests for Magento 2 modules',
    tags: ['testing', 'phpunit'],
    instructions:
      '### PHPUnit Testing\n\nWrite unit and integration tests for Magento 2 modules.',
    conventions: [{ rule: 'Place unit tests in Test/Unit directory' }],
    examples: [
      {
        title: 'Basic Unit Test',
        code: "class ProductTest extends TestCase\n{\n    public function testGetName(): void\n    {\n        $this->assertEquals('Test', $this->product->getName());\n    }\n}",
        language: 'php',
      },
    ],
    anti_patterns: [
      {
        pattern: 'Testing private methods directly',
        problem: 'Use public API instead',
      },
    ],
    references: [
      {
        title: 'Magento Testing Guide',
        url: 'https://developer.adobe.com/commerce/testing/guide/',
      },
    ],
    compatibility: ['claude', 'opencode', 'cursor', 'codex', 'qoder', 'trae'],
  },
];

const allFormats: OutputFormat[] = [
  'claude',
  'opencode',
  'cursor',
  'codex',
  'qoder',
  'trae',
  'markdown',
];

describe('generate snapshot tests', () => {
  beforeEach(() => {
    clearSchemaValidatorCache();
  });

  describe('single skill output', () => {
    for (const format of allFormats) {
      it(`generates stable output for ${format} format`, async () => {
        const output = await renderGeneratedOutput([makeSkill()], {
          format,
          includeExamples: true,
          includeAntipatterns: true,
          rootDir: PROJECT_ROOT,
        });

        expect(output).toMatchSnapshot();
      });
    }
  });

  describe('multi-skill output', () => {
    for (const format of allFormats) {
      it(`generates stable multi-skill output for ${format} format`, async () => {
        const output = await renderGeneratedOutput(twoSkills, {
          format,
          includeExamples: true,
          includeAntipatterns: true,
          rootDir: PROJECT_ROOT,
        });

        expect(output).toMatchSnapshot();
      });
    }
  });

  describe('option variations', () => {
    it('generates stable output with --no-examples (claude)', async () => {
      const output = await renderGeneratedOutput([makeSkill()], {
        format: 'claude',
        includeExamples: false,
        includeAntipatterns: true,
        rootDir: PROJECT_ROOT,
      });

      expect(output).toMatchSnapshot();
      expect(output).not.toContain('### Examples');
    });

    it('generates stable output with --no-antipatterns (claude)', async () => {
      const output = await renderGeneratedOutput([makeSkill()], {
        format: 'claude',
        includeExamples: true,
        includeAntipatterns: false,
        rootDir: PROJECT_ROOT,
      });

      expect(output).toMatchSnapshot();
      expect(output).not.toContain('### Anti-patterns');
    });

    it('generates stable output with both options disabled (claude)', async () => {
      const output = await renderGeneratedOutput([makeSkill()], {
        format: 'claude',
        includeExamples: false,
        includeAntipatterns: false,
        rootDir: PROJECT_ROOT,
      });

      expect(output).toMatchSnapshot();
      expect(output).not.toContain('### Examples');
      expect(output).not.toContain('### Anti-patterns');
    });

    it('generates stable output with both options disabled (cursor)', async () => {
      const output = await renderGeneratedOutput(twoSkills, {
        format: 'cursor',
        includeExamples: false,
        includeAntipatterns: false,
        rootDir: PROJECT_ROOT,
      });

      expect(output).toMatchSnapshot();
    });
  });

  describe('format-specific structure', () => {
    it('claude format has MageHub Context header', async () => {
      const output = await renderGeneratedOutput([makeSkill()], {
        format: 'claude',
        includeExamples: true,
        includeAntipatterns: true,
        rootDir: PROJECT_ROOT,
      });

      expect(output).toContain('# MageHub Context');
      expect(output).toContain('Auto-generated by MageHub');
    });

    it('codex format has Agent Instructions header', async () => {
      const output = await renderGeneratedOutput([makeSkill()], {
        format: 'codex',
        includeExamples: true,
        includeAntipatterns: true,
        rootDir: PROJECT_ROOT,
      });

      expect(output).toContain('# MageHub — Magento 2 Agent Instructions');
    });

    it('cursor format has frontmatter', async () => {
      const output = await renderGeneratedOutput([makeSkill()], {
        format: 'cursor',
        includeExamples: true,
        includeAntipatterns: true,
        rootDir: PROJECT_ROOT,
      });

      expect(output).toContain('---');
      expect(output).toContain('description: MageHub');
      expect(output).toContain('alwaysApply: true');
    });

    it('qoder format has frontmatter', async () => {
      const output = await renderGeneratedOutput([makeSkill()], {
        format: 'qoder',
        includeExamples: true,
        includeAntipatterns: true,
        rootDir: PROJECT_ROOT,
      });

      expect(output).toContain('---');
      expect(output).toContain('name: MageHub');
      expect(output).toContain('type: context');
    });

    it('trae format has skill summary list', async () => {
      const output = await renderGeneratedOutput(twoSkills, {
        format: 'trae',
        includeExamples: true,
        includeAntipatterns: true,
        rootDir: PROJECT_ROOT,
      });

      expect(output).toContain('## Skill Summary');
      expect(output).toContain('Plugin Development (module-plugin)');
      expect(output).toContain('PHPUnit Testing (testing-phpunit)');
    });

    it('opencode format has Skill Pack header', async () => {
      const output = await renderGeneratedOutput([makeSkill()], {
        format: 'opencode',
        includeExamples: true,
        includeAntipatterns: true,
        rootDir: PROJECT_ROOT,
      });

      expect(output).toContain('# MageHub Skill Pack');
    });

    it('markdown format has generic header', async () => {
      const output = await renderGeneratedOutput([makeSkill()], {
        format: 'markdown',
        includeExamples: true,
        includeAntipatterns: true,
        rootDir: PROJECT_ROOT,
      });

      expect(output).toContain('# MageHub');
      expect(output).toContain('Generated skills:');
    });
  });
});
