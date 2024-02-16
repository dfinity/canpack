import { JSONSchemaType } from 'ajv';

export interface Config {
    rust: RustConfig;
}

export interface RustConfig {
    parts: string[];
}

const RustConfigSchema: JSONSchemaType<Config> = require('./schemas/config.json');
