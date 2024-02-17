import { Config } from './config';
import { join } from 'path';
import { exists } from './util';
import { readFile, writeFile } from 'fs/promises';
import { parse, stringify, assign } from 'comment-json';

export const generateRust = async (
  directory: string,
  config: Config,
): Promise<string[]> => {
  // dfx.json
  const dfxJsonPath = join(directory, 'dfx.json');
  if (await exists(dfxJsonPath)) {
    const json = parse(await readFile(dfxJsonPath, 'utf8'));
    if (!(json as any)?.canisters?.rust) {
      const modified = assign(
        {
          canisters: {
            rust: {
              type: 'rust',
              package: 'canpack',
              candid: '.canpack-rs/service.did',
              gzip: true,
            },
          },
        },
        json,
      );
      await writeFile(dfxJsonPath, stringify(modified));
    }

    // Cargo.toml
    const cargoTomlPath = join(directory, 'Cargo.toml');
    if (!(await exists(cargoTomlPath))) {
        await writeFile(cargoTomlPath, )
        console.log('+ Cargo.toml')
    }
  }

  return false;
};
