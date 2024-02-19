import TOML from '@iarna/toml';
import { readFile } from 'fs/promises';
import {
  formatDir,
  formatGithubDir,
  getDependencyType,
} from 'ic-mops/dist/mops.js';
import { resolvePackages } from 'ic-mops/dist/resolve-packages.js';
import { join, relative } from 'path';
import {
  CanisterConfig,
  RustConfig,
  RustDependency as RustPart,
} from './config.js';
import { exists } from './util.js';

interface MopsConfig {
  dependencies?: Record<string, string>;
  'rust-dependencies'?: Record<string, string | RustPart>;
}

export const loadMopsCanisters = async (
  directory: string,
): Promise<Record<string, CanisterConfig> | undefined> => {
  const canisters: Record<string, CanisterConfig> = {};
  const rustConfig: RustConfig = { type: 'rust', parts: [] };
  canisters['motoko_rust'] = rustConfig;
  if (!addMopsRustDependencies(directory, directory, rustConfig)) {
    return;
  }

  const mopsPackages = await resolvePackages({ verbose: false });
  await Promise.all(
    Object.entries(mopsPackages).map(async ([name, version]) => {
      // TODO: contribute utility method in Mops
      const dependencyType = getDependencyType(version);
      let packageDirectory;
      if (dependencyType === 'local') {
        packageDirectory = relative(directory, version);
      } else if (dependencyType === 'github') {
        packageDirectory = relative(directory, formatGithubDir(name, version));
      } else if (dependencyType === 'mops') {
        packageDirectory = relative(directory, formatDir(name, version));
      } else {
        return;
      }

      addMopsRustDependencies(packageDirectory, directory, rustConfig);
    }),
  );

  console.log('>>>>>', rustConfig); /////

  return canisters;
};

const addMopsRustDependencies = async (
  directory: string,
  baseDirectory: string,
  rustConfig: RustConfig,
): Promise<boolean> => {
  const mopsTomlPath = join(directory, 'mops.toml');
  if (!(await exists(mopsTomlPath))) {
    return false;
  }
  const mopsToml: MopsConfig = TOML.parse(await readFile(mopsTomlPath, 'utf8'));
  if (mopsToml?.['rust-dependencies']) {
    Object.entries(mopsToml['rust-dependencies']).forEach(([name, value]) => {
      rustConfig.parts.push({
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
    // TODO: handle dependency conflicts
  }
  return true;
};
