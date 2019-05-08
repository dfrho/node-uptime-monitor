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
  maxChecks: 5
 };

 // Production environment
 environments.production = {
  httpPort:  5000,
  httpsPort: 5001,
  envName: 'production',
  hashingSecret: 'thisIsAnotherSecret',
  maxChecks: 5
};

// Determine which is active environment
const currentEnv = typeof process.env.NODE_ENV === 'string' ?  process.env.NODE_ENV.toLowerCase() : '';

// Match environment parameter to one above or default to 'staging'
const envToExport = typeof environments[currentEnv] === 'object' ? environments[currentEnv] : environments.staging;

module.exports = envToExport;
