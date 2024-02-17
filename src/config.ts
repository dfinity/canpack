import { JSONSchemaType } from 'ajv';
import { readFileSync } from 'fs';
import { join } from 'path';

export interface Config {
  canisters?: Record<string, CanisterConfig>;
  git?: boolean;
}

export type CanisterConfig = RustConfig;

export interface RustConfig {
  type: 'rust';
  parts: (string | RustPart)[];
}

export interface RustPart {
  path?: string;
  package: string;
}

export const configSchema: JSONSchemaType<Config> = JSON.parse(
  readFileSync(join(__dirname, 'schemas/config.schema.json'), 'utf8'),
);
