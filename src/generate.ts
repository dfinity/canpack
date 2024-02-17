import { Config, RustConfig } from './config';
import { join } from 'path';
import { exists } from './util';
import { readFile, writeFile } from 'fs/promises';
import { generateTemplateFiles } from 'generate-template-files';

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
            (json.canisters || (json.canisters = {}))[name] = {
              type: 'rust',
              package: 'canpack',
              candid: '.canpack-rs/service.did',
              gzip: true,
              canpack: true,
            };
            changed = true;
          }
        }
      }
      if (changed) {
        changes.push('* dfx.json');
        // TODO: keep formatting
        await writeFile(dfxJsonPath, JSON.stringify(json, null, 2));
      }
    }

    // Cargo.toml
    const cargoTomlPath = join(directory, 'Cargo.toml');
    if (!(await exists(cargoTomlPath))) {
      changes.push('+ Cargo.toml');
      await writeFile(
        cargoTomlPath,
        await readFile(join(__dirname, './templates/Cargo.toml')),
      );
    }

    // .canpack-rs
    const rustProjectPath = join(directory, '.canpack-rs');
    if (!(await exists(rustProjectPath))) {
      // ..... TODO
      changes.push('+ .canpack-rs');
    }
  }

  return changes;
};
