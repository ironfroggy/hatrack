//Lets require/import the HTTP module
var child_process = require('child_process');
var http = require('http');
var yaml = require('yamljs');
var psTree = require('ps-tree');
var path = require('path');
var fs = require('fs');

var argv = require('yargs')
  .default('config',  "./config.yaml")
  .default('address', 'localhost')
  .default('port', 8080)
  .argv;


//Lets define a port we want to listen to
const WORKER_PORT_MIN = 8081;
const WORKER_PORT_MAX = 8100;
const WORKER_CHECK_INTERVAL = 1000;
const WORKER_TIMEOUT = 10 * 1000;
const config = yaml.load(argv.config);
const workers = {};
const mimeTypes = {
  "html": "text/html",
  "jpeg": "image/jpeg",
  "jpg": "image/jpeg",
  "png": "image/png",
  "js": "text/javascript",
  "css": "text/css",
};

_NEXT_PORT = WORKER_PORT_MIN;
function next_port() {
  var port = _NEXT_PORT;
  _NEXT_PORT++;
  if (_NEXT_PORT > WORKER_PORT_MAX) {
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
    worker.address = '127.0.0.1';
    worker.port = next_port();
    restartWorker(name);
  }
  return worker;
}
function restartWorker(name) {
  var worker = workers[name];
  var env = {};
  env[worker.port_env] = worker.port;
  worker.process = child_process.spawn(worker.command, worker.arguments, {
    env: env,
  });
  worker.startTime = new Date();
  setTimeout(function(){
    timeoutWorker(name);
  }, WORKER_CHECK_INTERVAL);
}

function ensureWorker(name) {
  var workerConfig = config.workers[name];
  if (typeof workers[name] === "undefined") {
    workers[name] = initializeWorker(name);
  } else if (workers[name].process === null) {
    restartWorker(name);
  }
  return workers[name];
}

function timeoutWorker(name) {
  var worker = workers[name];
  var age = new Date() - worker.startTime;
  if (age > WORKER_TIMEOUT) {
    console.log('KILL ' + worker.process.pid + " " + name);
    kill(worker.process.pid);
    worker.process = null;
  } else {
    setTimeout(function(){
      timeoutWorker(name);
    }, WORKER_CHECK_INTERVAL);
  }
}

function serveStatic(request, response, localPath) {
  var filename = path.join(process.cwd(), localPath);
  fs.exists(filename, function(exists) {
    if(!exists) {
        console.log("not exists: " + filename);
        response.writeHead(200, {'Content-Type': 'text/plain'});
        response.write('404 Not Found\n');
        response.end();
    }
    var mimeType = mimeTypes[path.extname(filename).split(".")[1]];
    response.writeHead(200, mimeType);

    var fileStream = fs.createReadStream(filename);
    fileStream.pipe(response);
  });
}

function cleanHeaders(headers) {
  return headers;
}

//We need a function which handles requests and send response
function handleRequest(request, response){
  var workerName;
  var proxyUrl;
  for (workerName in config.workers) {
    var workerPrefix = config.workers[workerName].prefix;
    if (request.url.match("^/" + workerPrefix + "/") !== null) {
      proxyUrl = request.url.slice(workerPrefix.length + 1, request.url.length);
      break;
    } else {
      console.log("!", request.url, workerPrefix);
    }
  }
  if (!proxyUrl) {
    workerName = "default";
    proxyUrl = "/";
  }
  var worker = ensureWorker(workerName);

  if (!!worker.static) {
    serveStatic(request, response, worker.static);
  } else {
    var req = http.request({
        host: worker.address,
        // proxy IP
        port: worker.port,
        // proxy port
        method: request.method,
        path: proxyUrl,
        headers: cleanHeaders(request.headers),
    }, function (res) {
        res.on('data', function (data) {
            response.write(data);
        });
        res.on('end', function(){
          console.log('DONE');
          response.end('');
        });
    });
    if (request.method === "POST") {
      request.on('data', function(data){
        req.write(data);
      })
      request.on('end', function() {
        req.end();
      })
    } else {
      req.end();
    }
    req.on('error', function(e){
      console.log('ERROR ' + e);
      response.end('');
    });
  }
}

//Create a server
var server = http.createServer(handleRequest);

//Lets start our server
server.listen(argv.port, function(){
  //Callback triggered when server is successfully listening. Hurray!
  console.log("Server listening on: http://localhost:%s", argv.port);
});
