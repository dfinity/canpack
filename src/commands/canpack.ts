import chalk from 'chalk';
import { program } from 'commander';
import { loadConfig } from '../config.js';
import { canpack } from '../index.js';

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

// tslint:disable-next-line
(async () => {
  const directory = '.'; // Current working directory

  const config = await loadConfig(directory);
  if (verbose) {
    config.verbose = true;
    console.log(
      'Resolved configuration:',
      chalk.gray(JSON.stringify(config, null, 2)),
    );
  }
  await canpack(config);
})();
