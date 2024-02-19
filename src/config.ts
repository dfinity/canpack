import Ajv, { JSONSchemaType } from 'ajv';
import { readFileSync } from 'fs';
import { exists, moduleRelative } from './util.js';
import { loadMopsCanisters } from './mops.js';
import { readFile } from 'fs/promises';
import { join } from 'path';

export interface Config {
  canisters?: Record<string, CanisterConfig>;
  git?: boolean;
}

export type CanisterConfig = RustConfig;

export interface RustConfig {
  type: 'rust';
  parts: RustDependency[];
}

export interface RustDependency {
  package: string;
  version?: string;
  path?: string;
  git?: string;
}

export const configSchema = JSON.parse(
  readFileSync(
    moduleRelative(import.meta, '../common/canpack.schema.json'),
    'utf8',
  ),
) as JSONSchemaType<Config>;

const ajv = new Ajv();

export const loadConfig = async (directory: string): Promise<Config> => {
  // canpack.json
  const configPath = join(directory, 'canpack.json');
  const config: Config = (await exists(configPath))
    ? JSON.parse(await readFile(configPath, 'utf8'))
    : {};
  const validate = ajv.compile(configSchema);
  if (!validate(config)) {
    // TODO: simplify error output
    throw new Error(JSON.stringify(validate.errors, null, 2));
  }
  // mops.toml
  const mopsCanisters = await loadMopsCanisters(directory);
  if (mopsCanisters) {
    config.canisters = { ...mopsCanisters, ...config.canisters };
  }
  return config;
};
