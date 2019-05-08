/*
 * App entry module
 *
 */

// Dependencies
const fs = require('fs');
const http = require('http');
const https = require('https');
const StringDecoder = require('string_decoder').StringDecoder;
const url = require('url');

const config = require('./config');
const handlers = require('./lib/handlers');
const helpers = require('./lib/helpers');

// Instantiate the http server
const httpServer = http.createServer((req, res) => {
  unifiedServer(req, res);
});

// Start the server, and have it listen on port 3000
httpServer.listen(config.httpPort, () => {
  console.log(`The http server is listening on port ${config.httpPort}.`);
});

// Instantiate the https server
const httpsServerOptions = {
  'key' : fs.readFileSync('./https/key.pem'),
  'cert' : fs.readFileSync('./https/cert.pem'),
}
const httpsServer = https.createServer(httpsServerOptions, (req, res) => {
  unifiedServer(req, res);
});

// Start the https server, and have it listen on port 5000
httpsServer.listen(config.httpsPort, () => {
  console.log(`The https server is listening on port ${config.httpsPort}.`);
});

// Server logic for both http and https
const unifiedServer = (req, res) => {
  // Get the url and parse it
  const parsedUrl = url.parse(req.url, true);

  // Get the path from the url, trim the string
  const path =  parsedUrl.pathname;
  const trimmedPath = path.replace(/^\/+|\/+$/g, '');

  // Get the query string as an object (per 'true' parameter in url.parse method)
  const queryStringObject = parsedUrl.query;

  // Get the http method
  const method = req.method.toLowerCase();

  // Get the headers as an object
  const headers = req.headers;

  // Get the payload if any
  const decoder = new StringDecoder('utf-8');
  let buffer = '';
  req.on('data', (data) => {
    buffer += decoder.write(data)
  });
  req.on('end', () => {
    buffer += decoder.end();

    // Choose the handler this request should go to. If not found, use default
    const chosenHandler = typeof router[trimmedPath] !== 'undefined' ?
      router[trimmedPath] :
      handlers.notFound;

    // Construct data object to send to handler
    const data = {
      trimmedPath,
      queryStringObject,
      method,
      headers,
      payload : helpers.parseJsonToObject(buffer)
    };

    // Route the request to the handler
    chosenHandler(data, (statusCode, payload) => {
      // Use the status code called back by the handler, or default to 200
      statusCode = typeof statusCode == 'number' ? statusCode : 200;

      // Use the payload called back by the handler, or default to {}
      payload = typeof payload == 'object' ? payload : {};

      // Convert the payload to a string
      const payloadString = JSON.stringify(payload);

      // Return the response
      res.setHeader('Content-Type', 'application/json');
      res.writeHead(statusCode);
      res.end(payloadString);

      // Log the request path (slug)
      console.log(`Returning this response: ${statusCode + payloadString}`);
    })
  })
};

// Define a request router
const { checks, ping, tokens, users } = handlers;
const router = { checks, ping, tokens, users };
