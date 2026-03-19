import path from 'node:path';

export const DEFAULT_CONFIG_FILE = '.magehub.yaml';

export interface MageHubPaths {
  rootDir: string;
  skillsDir: string;
  schemaDir: string;
  configFile: string;
}

export function createMageHubPaths(rootDir: string): MageHubPaths {
  return {
    rootDir,
    skillsDir: path.join(rootDir, 'skills'),
    schemaDir: path.join(rootDir, 'schema'),
    configFile: path.join(rootDir, DEFAULT_CONFIG_FILE),
  };
}
