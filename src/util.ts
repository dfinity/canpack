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

export const moduleRelative = (meta: ImportMeta, ...args: string[]): string => {
  /// Equivalent to `import.meta.dirname` in recent Node.js versions
  const importMetaDirname = dirname(fileURLToPath(meta.url));
  return join(importMetaDirname, ...args);
};
