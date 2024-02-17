import fs from 'fs/promises';
import { Config } from './config';
import { generateRust } from './rust';

export const loadConfig = async (path: string): Promise<Config> => {
  const config = JSON.parse(await fs.readFile(path, 'utf8'));
  return config;
};

export const canpack = async (directory: string, config: Config) => {
  if (config.rust) {
    const changes = await generateRust(directory, config);
    if (changes.length) {
      console.log('* Rust');
      changes.forEach((change) => {
        console.log(`  ${change}`);
      });
    }
  }
};
