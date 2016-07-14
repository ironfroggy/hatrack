var yaml = require('yamljs');
var osHomedir = require('os-homedir');
var join = require('path').join;

var argv = require('yargs')
  .default('config', join(osHomedir(), ".hatrack.yaml"))
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
