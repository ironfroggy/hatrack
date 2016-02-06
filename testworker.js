//Lets require/import the HTTP module
var http = require('http');
var process = require('process');

//Lets define a port we want to listen to
const PORT = process.env.PORT;

//We need a function which handles requests and send response
function handleRequest(request, response){
    response.write(request.method + "\n");
    if (request.method === "POST") {
      request.on('data', function(data) {
        response.write(data);
      });
      request.on('end', function() {
        response.end('\nWorker worked');
      })
    } else {
      for (var h in request.headers) {
        response.write(h);
        response.write(": ");
        response.write(request.headers[h]);
        response.write("\n");
      }
      response.end('\nWorker worked');
    }
}

//Create a server
var server = http.createServer(handleRequest);

//Lets start our server
server.listen(PORT, function(){
    //Callback triggered when server is successfully listening. Hurray!
    console.log("Server listening on: http://localhost:%s", PORT);
});
