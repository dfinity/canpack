import fs from 'fs/promises';
import { Config } from './config';

const DEFAULT_CONFIG_PATH = 'canpack.json';

export const loadConfig = async (
  path: string | undefined = undefined,
): Promise<Config> => {
  const config = JSON.parse(
    await fs.readFile(path ?? DEFAULT_CONFIG_PATH, 'utf8'),
  );
  return config;
};

export const canpack = async (config: Config) => {};
