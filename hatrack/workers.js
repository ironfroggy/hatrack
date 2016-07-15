var psTree = require('ps-tree');
var child_process = require('child_process');
var tilde = require('expand-tilde');
var config = require('./config.js');

const workers = {};
const WORKER_CHECK_INTERVAL = 1000;

process.on('uncaughtException', function(err) {
  console.trace('Caught exception: ' + err);
});

var killWorkers = function() {
  for (var name in workers) {
    if (workers[name] && workers[name].process) {
      try {
        process.kill(workers[name].process.pid);
      } catch (e) {
        console.trace("Error killing worker:", e, workers[name].process.pid);
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
  worker.name = name;
  worker.timeout = worker.timeout || config.worker_timeout
  if (worker.command) {
    worker.starting = true;
    worker.startTime = new Date();
    worker.address = '127.0.0.1';
    worker.port = next_port();
    worker.active = false;
    restartWorker(name);
  }
  return worker;
}

function createEnv(worker) {
  var env = Object.assign({}, process.env, worker.env);
  var path = env.PATH.split(':');
  for (var i=0; i < path.length; i++) {
    path[i] = tilde(path[i]);
  }
  path = path.join(':');
  env.PATH = `${process.env.PATH}:${path}`;
  return env;
}

function spawnWorkerProcess(worker) {
  var opt = {
    env: createEnv(worker),
    cwd: tilde(worker.cwd || '.'),
  };
  var command = worker.command.trim();
  var arguments = worker.arguments || [];
  opt.env[worker.port_env] = worker.port;
  if (command.match(' ')) {
    if (arguments.length > 0) {
      throw "Cannot define both a shell command and arguments list.";
    }
    command = command.replace('$PORT', worker.port)
    worker.process = child_process.exec(tilde(command), opt);
    worker.process.stdout.on('data', (data) => {
      console.log(`${worker.name} stdout: ${data}`);
    });
    worker.process.stderr.on('data', (data) => {
      console.log(`${worker.name} stderr: ${data}`);
    });
  } else {
    worker.process = child_process.spawn(command, arguments, opt);
  }
}

function restartWorker(name) {
  var worker = workers[name];
  spawnWorkerProcess(worker);
  worker.lastTime = new Date();
  worker.starting = true;
  worker.active = false;
  setTimeout(function(){
    timeoutWorker(name);
  }, WORKER_CHECK_INTERVAL);
}

function timeoutWorker(name) {
  var worker = workers[name];
  var age = new Date() - worker.lastTime;
  if (age > config.worker_timeout && !worker.active) {
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
