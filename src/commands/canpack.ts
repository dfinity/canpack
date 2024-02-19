import { program } from 'commander';
import { Options, canpack } from '../index.js';
import { loadConfig } from '../config.js';

const { verbose, directory, version } = program
  .name('canpack')
  .option('-v, --verbose', `verbose output`)
  .option('-D, --directory <directory>', `directory`, '.')
  .option('-V, --version', `show installed version`)
  .parse()
  .opts();

if (version) {
  console.log('canpack', require('../../package.json').version);
  process.exit(0);
}

if (directory) {
  process.chdir(directory);
}

const options: Options = {
  verbose,
};

(async () => {
  const directory = '.'; // Current working directory

  const config = await loadConfig(directory);

  await canpack(config, options);
})();
