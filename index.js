
/*
 * App entry module
 *
 */

// Dependencies
const helpers = require('./lib/helpers');

const server = require('./lib/server');
const workers = require('./lib/workers');
const logs = require('./lib/logs');

const app = {};

// Init
app.init = () => {
  // Start server
  server.init();

  // Start workers
  workers.init();
}

logs.list('.lib/logs', err => console.log(err))

// Execute
app.init();

// helpers.sendTwilioSms('6464776360', "hello dude", (err) => {
//   console.error("oops! this happened: ", err)
// });

// Export the app
module.exports = app;
