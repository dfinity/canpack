import { stat } from 'fs/promises';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

/// https://github.com/nodejs/node/issues/39960
export const exists = async (filePath: string): Promise<boolean> => {
  try {
    await stat(filePath);
    return true;
  } catch {
    return false;
  }
};

/// Construct a relative path from the specified module import metadata.
export const moduleRelative = (meta: ImportMeta, ...args: string[]): string => {
  const importMetaDirname = dirname(fileURLToPath(meta.url));
  return join(importMetaDirname, ...args);
};

/// Check if the JSON of two objects are equal to each other
export const jsonEqual = <T extends object>(a: T, b: T): boolean => {
  return JSON.stringify(a) === JSON.stringify(b);
};
