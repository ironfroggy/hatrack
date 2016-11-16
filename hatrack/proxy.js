var http = require('http');
var config = require('./config.js');

function cleanHeaders(headers) {
  return headers;
}

function proxyToWorker(request, response, worker, proxyUrl) {
  worker.active = true;
  var req = http.request({
      host: worker.address,
      // proxy IP
      port: worker.port,
      // proxy port
      method: request.method,
      path: proxyUrl,
      headers: cleanHeaders(request.headers),
  }, function (res) {
      response.writeHead(res.statusCode, res.statusMessage, res.headers)
      res.on('data', function (data) {
          response.write(data);
      });
      res.on('end', function(){
        worker.active = false;
        response.end('');
      });
  });
  if (request.method === "POST") {
    request.on('data', function(data){
      worker.starting = false;
      req.write(data);
    })
    request.on('end', function() {
      req.end();
    })
  } else {
    req.end();
  }
  var ctx = this;
  var proxyArgs = arguments;

  // Setup proxy request timeout
  req.on('socket', function (socket) {
    socket.setTimeout(worker.proxyTimeout || config.timeout);
    socket.on('timeout', function() {
      console.log(`Request to worker ${worker.name} timed out (${worker.proxyTimeout}). URL: ${proxyUrl}`);
      req.abort();
    });
  });

  // Handle request errors
  req.on('error', function(e){
    // If the worker seems to not have started yet, give it another 1 second
    if (e.code === 'ECONNREFUSED' && worker.starting) {
      console.log(`${worker.name} waiting...`);
      var t = (new Date() - worker.lastTime);
      var startTimeout = worker.startTimeout || 1;
      var withinStartupTimeout = worker.starting && startTimeout && t < startTimeout;
      if (withinStartupTimeout) {
        setTimeout(() => proxyToWorker.apply(ctx, proxyArgs), 1000)
      } else {
        response.end('worker timeout');
      }
    } else {
      console.log(`${worker.name}(ERROR): ${e}`);
      response.end('');
    }
  });
}

module.exports.proxyToWorker = proxyToWorker;
