import fs from 'fs/promises';
import { Config, configSchema } from './config';
import { generate } from './generate';
import { join } from 'path';
import Ajv from 'ajv';
import { exists } from './util';
import { loadMopsCanisters } from './mops';

const ajv = new Ajv();

export const loadConfig = async (directory: string): Promise<Config> => {
  // canpack.json
  const configPath = join(directory, 'canpack.json');
  const config: Config = (await exists(configPath))
    ? JSON.parse(await fs.readFile(configPath, 'utf8'))
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

export const canpack = async (directory: string, config: Config) => {
  if (config.canisters) {
    const changes = await generate(directory, config);
    if (changes.length) {
      changes.forEach((change) => {
        console.log(change);
      });
    }
  }
};
