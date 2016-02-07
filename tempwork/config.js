var yaml = require('yamljs');

var argv = require('yargs')
  .default('config',  "./config.yaml")
  .argv;

const configDefaults = {
  worker_port_min: 8081,
  worker_port_max: 8100,
  worker_timeout: 10 * 1000,
  timeout: 5000,
  port: 8080,
  address: 'localhost',
};
const config = Object.assign(configDefaults, yaml.load(argv.config), argv);
module.exports = config;