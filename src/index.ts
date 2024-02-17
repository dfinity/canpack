import fs from 'fs/promises';
import { Config } from './config';
import { generate } from './generate';

export const loadConfig = async (path: string): Promise<Config> => {
  const config = JSON.parse(await fs.readFile(path, 'utf8'));
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
