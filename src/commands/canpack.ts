import { program } from 'commander';
import { join } from 'path';
import { canpack, loadConfig } from '..';

const { version, directory } = program
  .name('canpack')
  .option('-D, --directory <directory>', `directory`)
  .option('-V, --version', `show installed version`)
  .parse()
  .opts();

if (version) {
  console.log('canpack', require('../../package.json').version);
  process.exit(0);
}

(async () => {
  const config = await loadConfig(join(directory || '.', 'canpack.json'));

  await canpack(directory, config);
})();
