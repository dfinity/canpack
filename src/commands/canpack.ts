import { program } from 'commander';
import { loadConfig } from '..';

const { version, configPath } = program
  .name('canpack')
  .option('-C, --config-path', `configuration file path`)
  .option('-V, --version', `show installed version`)
  .parse()
  .opts();

if (version) {
  console.log('canpack', require('../../package.json').version);
  process.exit(0);
}

(async () => {
  const config = await loadConfig(configPath);

  console.log(config); ///
})();
