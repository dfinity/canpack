import { JSONSchemaType } from 'ajv';
import { readFileSync } from 'fs';
import { moduleRelative } from './util.js';

export interface Config {
  canisters?: Record<string, CanisterConfig>;
  git?: boolean;
}

export type CanisterConfig = RustConfig;

export interface RustConfig {
  type: 'rust';
  parts: (string | RustDependency)[];
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
