import { program } from 'commander';
import { canpack, loadConfig } from '../index.js';

const { directory, version } = program
  .name('canpack')
  .option('-D, --directory <directory>', `directory`, '.')
  .option('-V, --version', `show installed version`)
  .parse()
  .opts();

if (version) {
  console.log('canpack', require('../../package.json').version);
  process.exit(0);
}

(async () => {
  const config = await loadConfig(directory);

  await canpack(directory, config);
})();
