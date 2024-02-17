import { readFile, writeFile } from 'fs/promises';
import { mkdirp } from 'mkdirp';
import { join } from 'path';
import copy from 'recursive-copy';
import { rimraf } from 'rimraf';
import { Config } from './config';
import { exists } from './util';
import replaceStream from 'replacestream';

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
                package: 'canpack',
                candid: '.canpack-rust/service.did',
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

    // Cargo.toml
    const cargoTomlPath = join(directory, 'Cargo.toml');
    if (!(await exists(cargoTomlPath))) {
      changes.push('+ Cargo.toml');
      await writeFile(
        cargoTomlPath,
        (
          await readFile(join(__dirname, './templates/Cargo.toml'), 'utf8')
        ).replace(
          '__members__',
          JSON.stringify(
            rustProjects.map(([name]) => `.canpack/canisters/${name}`),
          ),
        ), // TODO: TOML stringify?
      );
    }

    // .canpack/
    const canpackDirectory = join(directory, '.canpack');
    if (await exists(canpackDirectory)) {
      changes.push('* .canpack');
      await rimraf(canpackDirectory);
    } else {
      changes.push('+ .canpack');
    }
    mkdirp(canpackDirectory);

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
        await copy(
          join(__dirname, 'templates/rust'),
          join(canpackDirectory, name),
          {
            dot: true,
            transform: (src, dest, stats) =>
              replaceStream(
                '__cargo_toml_parts__',
                // TODO: TOML stringify?
                canisterConfig.parts
                  .map(
                    (part, i) =>
                      `part_${i} = { path = ${JSON.stringify(
                        part.path,
                      )}, package = ${JSON.stringify(part.package)} }`,
                  )
                  .join('\n'),
              ),
          },
        );
      }
    }
  }

  return changes;
};
