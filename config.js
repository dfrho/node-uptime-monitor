/*
 * create and export configuration variables
 *
 */

 const environments = {};

 // Staging, default environment
 environments.staging = {
  httpPort:  3000,
  httpsPort: 3001,
  envName: 'staging',
  hashingSecret: 'thisIsASecret',
  maxChecks: 5,
  twilio : {
    accountSid: 'AC4fc27e5c7b90352e9df7ccfadf372897',
    authToken: '3b5cf94a1ff12143a4f9aea7bc4d04dc',
    fromPhone: '+15166991838'
  }
 };

 // Production environment
 environments.production = {
  httpPort:  5000,
  httpsPort: 5001,
  envName: 'production',
  hashingSecret: 'thisIsAnotherSecret',
  maxChecks: 5,
  twilio : {
    accountSid: '',
    authToken: '',
    fromPhone: ''
  }
};

// Determine which is active environment
const currentEnv = typeof process.env.NODE_ENV === 'string' ?  process.env.NODE_ENV.toLowerCase() : '';

// Match environment parameter to one above or default to 'staging'
const envToExport = typeof environments[currentEnv] === 'object' ? environments[currentEnv] : environments.staging;

module.exports = envToExport;
