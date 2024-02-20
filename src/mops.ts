import TOML from '@iarna/toml';
import { readFile } from 'fs/promises';
import {
  formatDir,
  formatGithubDir,
  getDependencyType,
} from 'ic-mops/dist/mops.js';
import { resolvePackages } from 'ic-mops/dist/resolve-packages.js';
import { join, relative } from 'path';
import { CanisterConfig, RustConfig, RustDependency } from './config.js';
import { exists } from './util.js';

interface MopsConfig {
  dependencies?: Record<string, string>;
  'rust-dependencies'?: Record<string, string | RustDependency>;
}

export const loadMopsCanisters = async (): Promise<
  Record<string, CanisterConfig> | undefined
> => {
  const baseDirectory = '.'; // Mops currently only supports CWD in `resolvePackages()`

  const canisters: Record<string, CanisterConfig> = {};
  const rustConfig: RustConfig = { type: 'rust', parts: [] };
  canisters['motoko_rust'] = rustConfig;
  const dependencies = await getMopsRustDependencies(
    baseDirectory,
    baseDirectory,
  );
  if (!dependencies) {
    return;
  }

  const mopsPackages = await resolvePackages({ verbose: false });
  (
    await Promise.all(
      Object.entries(mopsPackages).map(async ([name, version]) => {
        // TODO: contribute utility method in Mops
        const type = getDependencyType(version);
        let directory;
        if (type === 'local') {
          directory = relative(baseDirectory, version);
        } else if (type === 'github') {
          directory = relative(baseDirectory, formatGithubDir(name, version));
        } else if (type === 'mops') {
          directory = relative(baseDirectory, formatDir(name, version));
        } else {
          throw new Error(`Unknown dependency type: ${type}`);
        }
        return getMopsRustDependencies(directory, baseDirectory);
      }),
    )
  ).forEach((packageDependencies) => {
    if (packageDependencies) {
      dependencies.push(...packageDependencies);
    }
  });
  rustConfig.parts.push(...dependencies);

  return canisters;
};

const getMopsRustDependencies = async (
  directory: string,
  baseDirectory: string,
): Promise<RustDependency[] | undefined> => {
  const mopsTomlPath = join(directory, 'mops.toml');
  if (!(await exists(mopsTomlPath))) {
    return;
  }
  const dependencies: RustDependency[] = [];
  const mopsToml: MopsConfig = TOML.parse(await readFile(mopsTomlPath, 'utf8'));
  if (mopsToml?.['rust-dependencies']) {
    Object.entries(mopsToml['rust-dependencies']).forEach(([name, value]) => {
      dependencies.push({
        package: name,
        ...(typeof value === 'string'
          ? { version: value }
          : {
              ...value,
              path:
                value.path === undefined
                  ? undefined
                  : join(relative(baseDirectory, directory), value.path),
            }),
      });
    });
  }
  return dependencies;
};
