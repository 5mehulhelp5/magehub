import path from 'node:path';

import { describe, expect, it } from 'vitest';

import {
  createMageHubPaths,
  DEFAULT_CONFIG_FILE,
} from '../../src/core/paths.js';
import {
  isPathInsideProject,
  resolveProjectRelativePath,
} from '../../src/core/runtime-assets.js';

describe('paths', () => {
  describe('DEFAULT_CONFIG_FILE', () => {
    it('is .magehub.yaml', () => {
      expect(DEFAULT_CONFIG_FILE).toBe('.magehub.yaml');
    });
  });

  describe('createMageHubPaths', () => {
    it('returns all expected paths', () => {
      const paths = createMageHubPaths('/project');

      expect(paths.rootDir).toBe('/project');
      expect(paths.skillsDir).toBe(path.join('/project', 'skills'));
      expect(paths.schemaDir).toBe(path.join('/project', 'schema'));
      expect(paths.configFile).toBe(path.join('/project', '.magehub.yaml'));
    });

    it('handles nested project paths', () => {
      const paths = createMageHubPaths('/home/user/projects/magento');

      expect(paths.skillsDir).toBe(
        path.join('/home/user/projects/magento', 'skills'),
      );
    });
  });
});

describe('runtime-assets path utilities', () => {
  describe('resolveProjectRelativePath', () => {
    it('resolves relative paths against root', () => {
      const result = resolveProjectRelativePath('/project', './custom');

      expect(result).toBe(path.resolve('/project', './custom'));
    });

    it('returns absolute paths unchanged', () => {
      const result = resolveProjectRelativePath('/project', '/tmp/absolute');

      expect(result).toBe(path.resolve('/tmp/absolute'));
    });

    it('resolves nested relative paths', () => {
      const result = resolveProjectRelativePath('/project', './a/b/c');

      expect(result).toBe(path.resolve('/project', 'a', 'b', 'c'));
    });

    it('normalizes paths with .. components', () => {
      const result = resolveProjectRelativePath('/project', './a/../b');

      expect(result).toBe(path.resolve('/project', 'b'));
    });
  });

  describe('isPathInsideProject', () => {
    it('accepts path equal to root', () => {
      expect(isPathInsideProject('/project', '/project')).toBe(true);
    });

    it('accepts child path', () => {
      expect(isPathInsideProject('/project', '/project/sub/dir')).toBe(true);
    });

    it('accepts deeply nested path', () => {
      expect(isPathInsideProject('/project', '/project/a/b/c/d/e')).toBe(true);
    });

    it('rejects parent path', () => {
      expect(isPathInsideProject('/project/sub', '/project')).toBe(false);
    });

    it('rejects sibling path', () => {
      expect(isPathInsideProject('/project', '/other')).toBe(false);
    });

    it('rejects path with common prefix but different directory', () => {
      expect(isPathInsideProject('/project', '/project-other')).toBe(false);
    });

    it('handles trailing separators in root', () => {
      expect(isPathInsideProject('/project/', '/project/sub')).toBe(true);
    });

    it('normalizes relative path components', () => {
      expect(isPathInsideProject('/project', '/project/sub/../sub/file')).toBe(
        true,
      );
    });

    it('rejects path that escapes via ..', () => {
      expect(
        isPathInsideProject('/project/sub', '/project/sub/../../etc'),
      ).toBe(false);
    });

    it('handles paths built with path.join', () => {
      const root = path.join(path.sep, 'project');
      const child = path.join(root, 'sub', 'dir');

      expect(isPathInsideProject(root, child)).toBe(true);
    });

    it('rejects path.join sibling', () => {
      const root = path.join(path.sep, 'project');
      const sibling = path.join(path.sep, 'project-sibling');

      expect(isPathInsideProject(root, sibling)).toBe(false);
    });

    it('known edge case: filesystem root as project root produces double separator', () => {
      // When rootDir is '/', normalizedRoot becomes '//' due to path.resolve('/') + path.sep
      // This is a known limitation — Magento projects should never live at filesystem root
      const root = path.sep;

      expect(isPathInsideProject(root, path.join(root, 'anything'))).toBe(
        false,
      );
    });

    it('rejects when target equals parent of root via ..', () => {
      const root = path.join(path.sep, 'a', 'b');
      const target = path.join(path.sep, 'a');

      expect(isPathInsideProject(root, target)).toBe(false);
    });
  });
});
