import { stat } from 'fs/promises';

/// https://github.com/nodejs/node/issues/39960
export const exists = async (filePath: string): Promise<boolean> => {
  try {
    await stat(filePath);
    return true;
  } catch {
    return false;
  }
};
