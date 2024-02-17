import { JSONSchemaType } from 'ajv';
import { readFileSync } from 'fs';
import { join } from 'path';

export interface Config {
  rust: RustConfig;
}

export interface RustConfig {
  canister?: string;
  parts: string[];
}

export const configSchema: JSONSchemaType<Config> = JSON.parse(
  readFileSync(join(__dirname, '../schemas/config.json'), 'utf8'),
);
