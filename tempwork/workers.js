var psTree = require('ps-tree');
var child_process = require('child_process');
var config = require('./config.js');

const workers = {};
const WORKER_CHECK_INTERVAL = 1000;

var killWorkers = function() {
  for (var name in workers) {
    if (workers[name]) {
      try {
        process.kill(workers[name].process.pid);
      } catch (e) {
        console.error("Error killing worker:", e, workers[name].process.pid);
      }
    }
  }
  process.exit();
};

process.on("uncaughtException", killWorkers);
process.on("SIGINT", killWorkers);
process.on("SIGTERM", killWorkers);

_NEXT_PORT = config.worker_port_min;
function next_port() {
  var port = _NEXT_PORT;
  _NEXT_PORT++;
  if (_NEXT_PORT > config.worker_port_max) {
    console.error("Exceeded port maximum");
  }
  return port;
}

var kill = function (pid, signal, callback) {
    signal   = signal || 'SIGKILL';
    callback = callback || function () {};
    var killTree = true;
    if(killTree) {
        psTree(pid, function (err, children) {
            [pid].concat(
                children.map(function (p) {
                    return p.PID;
                })
            ).forEach(function (tpid) {
                try { process.kill(tpid, signal) }
                catch (ex) { }
            });
            callback();
        });
    } else {
        try { process.kill(pid, signal) }
        catch (ex) { }
        callback();
    }
};

function initializeWorker(name) {
  var worker = config.workers[name];
  workers[name] = worker;
  if (worker.command) {
    worker.starting = true;
    worker.address = '127.0.0.1';
    worker.port = next_port();
    restartWorker(name);
  }
  return worker;
}
function restartWorker(name) {
  var worker = workers[name];
  var env = Object.assign(process.env);
  env[worker.port_env] = worker.port;
  worker.process = child_process.spawn(worker.command, worker.arguments, {
    env: env,
  });
  worker.lastTime = new Date();
  worker.starting = true;
  setTimeout(function(){
    timeoutWorker(name);
  }, WORKER_CHECK_INTERVAL);
}

function timeoutWorker(name) {
  var worker = workers[name];
  var age = new Date() - worker.lastTime;
  if (age > config.worker_timeout) {
    console.log('KILL ' + worker.process.pid + " " + name);
    kill(worker.process.pid);
    worker.process = null;
  } else {
    setTimeout(function(){
      timeoutWorker(name);
    }, WORKER_CHECK_INTERVAL);
  }
}

module.exports = {
  ensureWorker: function(name) {
    var workerConfig = config.workers[name];
    if (typeof workers[name] === "undefined") {
      workers[name] = initializeWorker(name);
    } else if (workers[name].process === null) {
      restartWorker(name);
    }
    return workers[name];
  }
};
