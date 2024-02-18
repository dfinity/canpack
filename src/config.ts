import { JSONSchemaType } from 'ajv';

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

export const configSchema =
  require('../common/canpack.schema.json') as JSONSchemaType<Config>;
