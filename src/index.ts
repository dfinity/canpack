import fs from 'fs/promises';
import { Config, configSchema } from './config';
import { generate } from './generate';
import Ajv from 'ajv';

const ajv = new Ajv();

export const loadConfig = async (path: string): Promise<Config> => {
  const config = JSON.parse(await fs.readFile(path, 'utf8'));
  const validate = ajv.compile(configSchema);
  if (!validate(config)) {
    // TODO: simplify error output
    throw new Error(JSON.stringify(validate.errors, null, 2));
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
