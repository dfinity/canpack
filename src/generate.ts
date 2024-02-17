import { readFile, writeFile } from 'fs/promises';
import { mkdirp } from 'mkdirp';
import { join } from 'path';
import copy from 'recursive-copy';
import { rimraf } from 'rimraf';
import { Config } from './config';
import { exists } from './util';
import TOML from '@iarna/toml';

import execa = require('execa');

interface DfxJson {
  canisters?: Record<string, DfxCanister>;
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

export const generate = async (
  directory: string,
  config: Config,
): Promise<string[]> => {
  const changes = [];

  // dfx.json
  const dfxJsonPath = join(directory, 'dfx.json');
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

    const templateDirectory = join(__dirname, 'templates');

    // Cargo.toml
    const cargoTomlPath = join(directory, 'Cargo.toml');
    if (!(await exists(cargoTomlPath))) {
      changes.push('+ Cargo.toml');
      await replaceInFile(
        cargoTomlPath,
        [
          [
            '# __members__',
            `${TOML.stringify({
              members: rustProjects.map(([name]) => `.canpack/${name}`),
            }).trim()}`,
          ],
        ],
        { from: join(templateDirectory, 'Cargo.toml') },
      );
    }

    // .canpack/
    const canpackDirectory = join(directory, '.canpack');
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
          ['"__package_name__"', JSON.stringify(name)],
          [
            '# __parts__',
            canisterConfig.parts
              .map(
                (part, i) =>
                  `part_${i} = { path = ${JSON.stringify(
                    join('../..', part.path), // TODO: absolute paths?
                  )}, package = ${JSON.stringify(part.package)} }`,
              )
              .join('\n'),
          ],
        ]);
        // .canpack/<canister>/src/main.rs
        await replaceInFile(join(canisterDirectory, 'src/main.rs'), [
          [
            '// __parts__',
            canisterConfig.parts
              .map((part, i) => `part_${i}::canpack!();`)
              .join('\n'),
          ],
        ]);
      }

      // .canpack/<canister>/service.did
      // TODO: possibly replace with a different approach
      for (const [name, canisterConfig] of rustProjects) {
        changes.push(`* .canpack/${name}/service.did`);
        const result = await execa('cargo', ['run', '--package', name], {
          cwd: directory,
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
