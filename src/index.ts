import { Config } from './config.js';
import { generate } from './generate.js';

export type Options = {
  verbose: boolean;
};

export const defaultOptions = {
  verbose: false,
};

export const canpack = async (config: Config, options?: Partial<Options>) => {
  const allOptions = { ...defaultOptions, ...options };
  if (config.canisters) {
    const changes = await generate(config, allOptions);
    if (changes.length) {
      changes.forEach((change) => {
        console.log(change);
      });
    }
  }
};
