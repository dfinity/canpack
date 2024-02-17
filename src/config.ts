import { JSONSchemaType } from 'ajv';

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

export const configSchema =
  require('../common/canpack.schema.json') as JSONSchemaType<Config>;
