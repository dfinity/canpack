import TOML from '@iarna/toml';
import { readFile } from 'fs/promises';
import { installAll } from 'ic-mops/dist/commands/install-all.js';
import {
  formatDir,
  formatGithubDir,
  getDependencyType,
} from 'ic-mops/dist/mops.js';
import { resolvePackages } from 'ic-mops/dist/resolve-packages.js';
import { join, relative, resolve } from 'path';
import { CanisterConfig, RustConfig, RustDependency } from './config.js';
import { exists, jsonEqual } from './util.js';
import chalk from 'chalk';

interface MopsConfig {
  package?: {
    name?: string;
    version?: string;
    description?: string;
  };
  dependencies?: Record<string, string>;
  'rust-dependencies'?: Record<string, string | RustDependency>;
}

const mopsPathSymbol = Symbol.for('mopsPath');

interface MopsRustDependency extends RustDependency {
  [mopsPathSymbol]?: string;
}

export const loadMopsCanisters = async (
  verbose: boolean,
): Promise<Record<string, CanisterConfig> | undefined> => {
  const baseDirectory = '.'; // Mops currently only supports CWD in `resolvePackages()`

  const canisters: Record<string, CanisterConfig> = {};
  const rustConfig: RustConfig = { type: 'rust', parts: [] };
  canisters['motoko_rust'] = rustConfig;
  const mainDependencies = await getMopsRustDependencies(
    baseDirectory,
    baseDirectory,
  );
  if (!mainDependencies) {
    return;
  }
  console.log(chalk.grey('Installing Mops packages...'));
  await installAll({ verbose, lock: 'ignore' });
  const dependencies = [...mainDependencies];
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
      packageDependencies.forEach((dependency) => {
        const other = dependencies.find(
          (other) => dependency.package === other.package,
        );
        if (!other) {
          dependencies.push(dependency);
        } else if (
          !mainDependencies.includes(other) &&
          !jsonEqual(dependency, other)
        ) {
          const showDependency = (dependency: MopsRustDependency) =>
            `${dependency.package} = ${JSON.stringify({ ...dependency, package: undefined })} in ${resolve(dependency[mopsPathSymbol])}`;
          throw new Error(
            [
              `Conflict between transitive Rust dependencies:`,
              showDependency(dependency),
              showDependency(other),
              `Fix this by specifying \`${dependency.package} = ...\` in the [rust-dependencies] section of your mops.toml file.`,
            ].join('\n'),
          );
        }
      });
    }
  });
  rustConfig.parts.push(...dependencies);

  return canisters;
};

const getMopsRustDependencies = async (
  directory: string,
  baseDirectory: string,
): Promise<MopsRustDependency[] | undefined> => {
  const mopsTomlPath = join(directory, 'mops.toml');
  if (!(await exists(mopsTomlPath))) {
    return;
  }
  const dependencies: MopsRustDependency[] = [];
  const mopsToml: MopsConfig = TOML.parse(await readFile(mopsTomlPath, 'utf8'));
  if (mopsToml?.['rust-dependencies']) {
    Object.entries(mopsToml['rust-dependencies']).forEach(([name, value]) => {
      dependencies.push({
        package: name,
        [mopsPathSymbol]: mopsTomlPath,
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
