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
      Object.keys(res.headers).forEach((headerName)=>{
        response.setHeader(headerName, res.headers[headerName])
      })
      res.on('data', function (data) {
          response.write(data);
      });
      res.on('end', function(){
        console.log('DONE');
        worker.active = false;
        response.end('');
      });
  });
  if (request.method === "POST") {
    request.on('data', function(data){
      req.write(data);
    })
    request.on('end', function() {
      worker.starting = false;
      req.end();
    })
  } else {
    req.end();
  }
  var ctx = this;
  var proxyArgs = arguments;

  // Setup proxy request timeout
  req.on('socket', function (socket) {
    socket.setTimeout(worker.proxy_timeout || config.timeout);
    socket.on('timeout', function() {
      console.log(`Request to worker ${worker.name} timed out. URL: ${proxyUrl}`);
      req.abort();
    });
  });

  // Handle request errors
  req.on('error', function(e){
    console.log('ERROR ' + e);
    // If the worker seems to not have started yet, give it another 1 second
    if (e.code === 'ECONNREFUSED' && worker.starting) {
      console.log('try again in a second...');
      var t = (new Date() - worker.lastTime);
      var withinStartupTimeout = worker.starting && worker.startTimeout && t < worker.startTimeout
      if (withinStartupTimeout) {
        setTimeout(() => proxyToWorker.apply(ctx, proxyArgs), 1000)
      } else {
        response.end('worker timeout');
      }
    } else {
      response.end('');
    }
  });
}

module.exports.proxyToWorker = proxyToWorker;
