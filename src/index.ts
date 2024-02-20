import { Config } from './config.js';
import { generate } from './generate.js';

export const canpack = async (config: Config) => {
  if (config.canisters) {
    const changes = await generate(config);
    if (changes.length) {
      changes.forEach((change) => {
        console.log(change);
      });
    }
  }
};
