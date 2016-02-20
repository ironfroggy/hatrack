#!/usr/bin/env node
//Lets require/import the HTTP module
var http = require('http');
var path = require('path');
var fs = require('fs');

var config = require('./config.js');
var proxyToWorker = require('./proxy.js').proxyToWorker;
var ensureWorker = require('./workers.js').ensureWorker;

const mimeTypes = {
  "html": "text/html",
  "jpeg": "image/jpeg",
  "jpg": "image/jpeg",
  "png": "image/png",
  "js": "text/javascript",
  "css": "text/css",
};

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

//We need a function which handles requests and send response
function handleRequest(request, response){
  var workerName;
  var proxyUrl;
  var hostPieces = request.headers.host.match(/([^:]+):(\d+)/);
  var host = hostPieces[1];
  var port = hostPieces[2];
  console.log(request.headers.host, host, port);

  for (workerName in config.workers) {
    var workerPrefix = config.workers[workerName].prefix;
    var workerHost = config.workers[workerName].host;
    if (host === workerHost) {
      console.log('routing for host', host, workerName);
      proxyUrl = request.url;
      break
    } else if (request.url.match("^/" + workerPrefix + "/") !== null) {
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
    worker.lastTime = new Date();
    proxyToWorker(request, response, worker, proxyUrl);
  }
}

//Create a server
var server;

function run() {
  server = http.createServer(handleRequest);
  //Lets start our server
  server.listen(config.port, config.address, function(){
    //Callback triggered when server is successfully listening. Hurray!
    console.log("Server listening on: http://localhost:%s", config.port);
  });
}
if (require.main === module) {
  run();
} else {
  module.exports.run = run;
}
