import fs from 'fs/promises';
import { Config } from './config';

const DEFAULT_CONFIG_PATH = 'canpack.json';

export const loadConfig = async (
    path: string = DEFAULT_CONFIG_PATH,
): Promise<Config> => {
    const config = JSON.parse(await fs.readFile(path, 'utf8'));
    return config;
};

export const canpack = async (config: Config) => {};
