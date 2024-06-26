import TOML from '@iarna/toml';
import { execa } from 'execa';
import { readFile, writeFile } from 'fs/promises';
import { mkdirp } from 'mkdirp';
import { join, resolve } from 'path';
import copy from 'recursive-copy';
import { rimraf } from 'rimraf';
import { Config, RustDependency } from './config.js';
import { exists, moduleRelative } from './util.js';
import chalk from 'chalk';

interface DfxJson {
  canisters?: Record<string, DfxCanister>;
}

interface CargoToml {
  workspace?: {
    members?: string[];
  };
}

interface DfxCanister {
  type?: string;
  package?: string;
  candid?: string;
  gzip?: boolean;
  canpack?: boolean;
}

const replaceInFile = async (
  path: string,
  variables: [string | RegExp, string][],
  options?: { from: string },
): Promise<void> => {
  let content = await readFile(options?.from ?? path, 'utf8');
  variables.forEach(([key, value]) => {
    content = content.replace(key, value);
  });
  await writeFile(path, content);
};

const getPartIdentifier = (part: RustDependency, i: number) => `part_${i}`;

export const generate = async (config: Config): Promise<string[]> => {
  const changes = [];

  // dfx.json
  const dfxJsonPath = 'dfx.json';
  if (await exists(dfxJsonPath)) {
    let changed = false;
    const json = JSON.parse(await readFile(dfxJsonPath, 'utf8')) as DfxJson;
    if (json?.canisters) {
      // Remove previously added canisters
      for (const [name, canister] of Object.entries(json.canisters)) {
        if (canister?.canpack) {
          delete json.canisters[name];
          changed = true;
        }
      }
      if (config.canisters) {
        for (const [name, canisterConfig] of Object.entries(config.canisters)) {
          if (!(json as any)?.canisters?.[name]) {
            if (canisterConfig.type === 'rust') {
              (json.canisters || (json.canisters = {}))[name] = {
                type: 'rust',
                package: name,
                candid: `.canpack/${name}/service.did`,
                gzip: true,
                canpack: true,
              };
              changed = true;
            }
          }
        }
      }
      if (changed) {
        changes.push('* dfx.json');
        // TODO: keep formatting
        await writeFile(dfxJsonPath, JSON.stringify(json, null, 2));
      }
    }

    const rustProjects = config.canisters
      ? Object.entries(config.canisters).filter(
          ([, { type }]) => type === 'rust',
        )
      : [];

    const templateDirectory = moduleRelative(
      import.meta,
      '../common/templates',
    );

    // Cargo.toml (replace if file starts with generated comment)
    const cargoTomlPath = 'Cargo.toml';
    const cargoTomlExists = await exists(cargoTomlPath);
    const getMemberPath = (name: string) => `.canpack/${name}`;
    if (
      !cargoTomlExists ||
      (await readFile(cargoTomlPath, 'utf8')).startsWith(
        '# Generated by Canpack',
      )
    ) {
      changes.push(`${cargoTomlExists ? '*' : '+'} Cargo.toml`);
      await replaceInFile(
        cargoTomlPath,
        [
          [
            '# __members__',
            `${TOML.stringify({
              members: rustProjects.map(([name]) => getMemberPath(name)),
            }).trim()}`,
          ],
        ],
        { from: join(templateDirectory, 'Cargo.toml') },
      );
    } else {
      const cargoToml: CargoToml = TOML.parse(
        await readFile(cargoTomlPath, 'utf8'),
      );
      const missingMembers = rustProjects
        .map(([name]) => getMemberPath(name))
        .filter((path) => !cargoToml?.workspace?.members?.includes(path));
      if (missingMembers.length) {
        console.log(
          chalk.yellow(
            `Add the following \`workspace.members\` to ${resolve(cargoTomlPath)}: ${JSON.stringify(missingMembers)}`,
          ),
        );
      }
    }

    // .canpack/
    const canpackDirectory = '.canpack';
    if (await exists(canpackDirectory)) {
      changes.push('* .canpack/');
      await rimraf(canpackDirectory);
    } else {
      changes.push('+ .canpack/');
    }
    await mkdirp(canpackDirectory);

    // .canpack/.gitignore
    if (!config.git) {
      const gitignorePath = join(canpackDirectory, '.gitignore');
      if (!(await exists(gitignorePath))) {
        await writeFile(gitignorePath, '**/*\n');
      }
    }

    // .canpack/<canister>/
    if (rustProjects.length) {
      for (const [name, canisterConfig] of rustProjects) {
        const canisterDirectory = join(canpackDirectory, name);
        await copy(join(templateDirectory, 'rust'), canisterDirectory, {
          dot: true,
        });
        // .canpack/<canister>/Cargo.toml
        await replaceInFile(join(canisterDirectory, 'Cargo.toml'), [
          [/"__package_name__"/g, JSON.stringify(name)],
          [
            '# __parts__',
            canisterConfig.parts
              .map((part, i) =>
                TOML.stringify({
                  dependencies: {
                    [getPartIdentifier(part, i)]:
                      typeof part === 'string'
                        ? part
                        : {
                            ...part,
                            path: part.path
                              ? join('../..', part.path)
                              : undefined,
                          },
                  },
                }),
              )
              .join(''),
          ],
        ]);
        // .canpack/<canister>/main.rs
        await replaceInFile(join(canisterDirectory, 'main.rs'), [
          [
            '// __parts__',
            canisterConfig.parts
              .map((part, i) => `${getPartIdentifier(part, i)}::canpack!();`)
              .join('\n'),
          ],
        ]);
      }

      // .canpack/<canister>/service.did
      for (const [name, canisterConfig] of rustProjects) {
        changes.push(`* .canpack/${name}/service.did`);
        const result = await execa('cargo', ['run', '--package', name], {
          stderr: 'inherit', // Console output
        }).catch((err) => {
          process.exit(err.exitCode);
        });
        await writeFile(
          join(canpackDirectory, name, 'service.did'),
          result.stdout,
        );
      }
    }
  }

  return changes;
};
