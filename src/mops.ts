import TOML from '@iarna/toml';
import {
  CanisterConfig,
  RustConfig,
  RustDependency as RustPart,
} from './config';
import { join } from 'path';
import { exists } from './util';
import { readFile } from 'fs/promises';

interface MopsConfig {
  dependencies?: Record<string, string>;
  'rust-dependencies'?: Record<string, string | RustPart>;
}

export const loadMopsCanisters = async (
  directory: string,
): Promise<Record<string, CanisterConfig> | undefined> => {
  const mopsTomlPath = join(directory, 'mops.toml');
  if (!(await exists(mopsTomlPath))) {
    return;
  }
  const mopsToml: MopsConfig = TOML.parse(await readFile(mopsTomlPath, 'utf8'));
  if (mopsToml?.['rust-dependencies']) {
    const rustConfig: RustConfig = { type: 'rust', parts: [] };
    Object.entries(mopsToml['rust-dependencies']).forEach(([name, value]) => {
      rustConfig.parts.push({
        package: name,
        ...(typeof value === 'string' ? { version: value } : value),
      });
    });
    return {
      motoko_rust: rustConfig,
    };
  }
};
