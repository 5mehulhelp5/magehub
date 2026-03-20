import { describe, expect, it } from 'vitest';

import { resolveShorthand } from '../../src/utils/shorthand.js';

describe('resolveShorthand', () => {
  const commands = [
    'setup:init',
    'skill:list',
    'skill:search',
    'skill:show',
    'skill:install',
    'skill:remove',
    'skill:verify',
    'config:show',
    'config:validate',
    'generate',
  ];

  it('returns unique match', () => {
    expect(resolveShorthand('g', commands)).toBe('generate');
    expect(resolveShorthand('generate', commands)).toBe('generate');
  });

  it('resolves unambiguous prefix', () => {
    expect(resolveShorthand('setup', commands)).toBe('setup:init');
    expect(resolveShorthand('skill:l', commands)).toBe('skill:list');
    expect(resolveShorthand('skill:i', commands)).toBe('skill:install');
    expect(resolveShorthand('skill:r', commands)).toBe('skill:remove');
    expect(resolveShorthand('skill:v', commands)).toBe('skill:verify');
    expect(resolveShorthand('config:v', commands)).toBe('config:validate');
  });

  it('throws on ambiguous prefix', () => {
    expect(() => resolveShorthand('skill:s', commands)).toThrow(
      'Ambiguous shorthand: skill:s',
    );
    expect(() => resolveShorthand('skill:s', commands)).toThrow(
      'skill:search, skill:show',
    );
  });

  it('throws on ambiguous config prefix', () => {
    expect(() => resolveShorthand('config:', commands)).toThrow(
      'Ambiguous shorthand: config:',
    );
  });

  it('throws on unknown shorthand', () => {
    expect(() => resolveShorthand('unknown', commands)).toThrow(
      'Unknown shorthand: unknown',
    );
  });

  it('throws on empty candidates', () => {
    expect(() => resolveShorthand('g', [])).toThrow('Unknown shorthand: g');
  });

  it('treats exact match as ambiguous when other candidates also match', () => {
    // resolveShorthand uses startsWith, so 'generate' matches both 'generate' and 'generate-all'
    expect(() =>
      resolveShorthand('generate', ['generate', 'generate-all']),
    ).toThrow('Ambiguous shorthand');
  });

  it('throws when single-character matches multiple commands', () => {
    // 's' matches setup:init, skill:list, skill:search, etc.
    expect(() => resolveShorthand('s', commands)).toThrow(
      'Ambiguous shorthand: s',
    );
  });

  it('is case sensitive', () => {
    expect(() => resolveShorthand('G', commands)).toThrow(
      'Unknown shorthand: G',
    );
  });
});
