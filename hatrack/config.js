var yaml = require('yamljs');
var osHomedir = require('os-homedir');
var join = require('path').join;

var argv = require('yargs')
  .default('config', join(osHomedir(), ".hatrack.yaml"))
  .argv;

const configDefaults = {
  worker_port_min: 8081,
  worker_port_max: 8100,
  worker_timeout: 10 * 60 * 1000, // Workers terminated after 10 minutes of non-use
  timeout: 5000, // Connections to workers timeout after 5 seconds without response
  port: 8080,
  address: 'localhost',
};
const config = Object.assign(configDefaults, yaml.load(argv.config), argv);
module.exports = config;
