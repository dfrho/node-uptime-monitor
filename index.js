/*
 * App entry module
 *
 */

// Dependencies
const http = require('http');
const https = require('https');
const url = require('url');
const StringDecoder = require('string_decoder').StringDecoder;
const config = require('./config');
const fs = require('fs');
const _data = require('./lib/data');

_data.create('test', 'newFile', {'foo':'bar'}, function(err){
  console.log('this was the error if any: ', err);
});

// Instantiate the http server
const httpServer = http.createServer(function(req, res) {
  unifiedServer(req, res);
});

// Start the server, and have it listen on port 3000
httpServer.listen(config.httpPort, function() {
  console.log(`The server is listening on port ${config.httpPort}.`);
});

// Instantiate the https server
const httpsServerOptions = {
  'key' : fs.readFileSync('./https/key.pem'),
  'cert' : fs.readFileSync('./https/cert.pem'),
}
const httpsServer = https.createServer(httpsServerOptions, function(req, res) {
  unifiedServer(req, res);
});

// Start the https server, and have it listen on port 5000
httpsServer.listen(config.httpsPort, function() {
  console.log(`The server is listening on port ${config.httpsPort}.`);
});

// Server logic for both http and https
const unifiedServer = function(req, res) {
  // Get the url and parse it
  const parsedUrl = url.parse(req.url, true);

  // Get the path from the url, trim the string
  const path =  parsedUrl.pathname;
  const trimmedPath = path.replace(/^\/+|\/+$/g, '');


  // Get the query string as an object (per 'true' parameter in url.parse method)
  const queryStrObject = parsedUrl.query;

  // Get the http method
  const method = req.method.toLowerCase();

  // Get the headers as an object
  const headers = req.headers;

  // Get the payload sent, if any
  const decoder = new StringDecoder('utf-8');
  let buffer = '';
  req.on('data', function(data){
    buffer += decoder.write(data)
  });
  req.on('end', function(){
    buffer += decoder.end();

    // Choose the handler this request should go to. If not found, use default
    const chosenHandler = typeof router[trimmedPath] !== 'undefined' ?
      router[trimmedPath] :
      handlers.notFound;

    // Construct data object to send to handler
    const data = {
      trimmedPath, 'queryStringObject': queryStrObject, method, headers, 'payload' : buffer
    };

    // Route the request to the handler
    chosenHandler(data, function(statusCode, payload) {
      // Use the status code called back by the handler, or default to 200
      statusCode = typeof statusCode == 'number' ? statusCode : 200;

      // Use the payload called back by the handler, or default to {}
      payload = typeof payload == 'object' ? payload : {};

      // Convert the payload to a string
      const payloadString = JSON.stringify(payload);

      // Return the response
      res.setHeader('Content-Type', 'application/json');
      res.writeHead(statusCode)
      res.end(payloadString);

      // Log the request path (slug)
      console.log("Returning this response: " + statusCode, payloadString);
    })
  })
};

// Define the handlers
const handlers = {};

// Sample handler
handlers.hello = function(date, callback) {
  // Callback an http status code, and a payload object
  callback(200, {'hello': 'I\'m at a place called Vertigo.'});
};

// Not found handler
handlers.notFound = function(data, callback) {
  callback(404);
};

// Define a request router
const router = {
  'hello': handlers.hello
};
