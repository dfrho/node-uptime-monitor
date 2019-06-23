/*
Helpers
*/

// Dependencies
const crypto = require('crypto');
const config = require('../config');
const https = require('https');
const querystring = require('querystring');

const helpers = {};

// Create a SHAD512 hash
helpers.hash = str => {
  if (typeof str === 'string' && str.length > 0){
    const hash = crypto.createHmac('sha512', config.hashingSecret).update(str).digest('hex');
    return hash;
  } else {
    return false;
  }
}

helpers.validateFirstName = firstName => {
  return typeof firstName === 'string' && firstName.trim().length > 0
    ? firstName.trim()
    : false;
}

helpers.validateLastName = lastName => {
  return typeof lastName === 'string' && lastName.trim().length > 0
    ? lastName.trim()
    : false;
}

helpers.validatePassword = password => {
  return typeof password === 'string' && password.trim().length > 0
    ? password.trim()
    : false;
}

helpers.validateTosAgreement = tosAgreement => typeof tosAgreement === 'boolean' && tosAgreement === true ? true : false;

helpers.validatePhone = phone => typeof phone === 'string' && phone.trim().length === 10 ? phone.trim() : false;

helpers.validateId = id => typeof id === 'string' && id.trim().length === 20 ? id.trim() : false;

helpers.validateExtend = extend => typeof extend === 'boolean' && extend === true ? true : false;

helpers.validateToken = token => typeof token === 'string' ? token : false;

helpers.validateProtocol = protocol => typeof protocol === 'string' &&
  ['http', 'https'].includes(protocol) ? protocol : false;

helpers.validateUrl= url => typeof url === 'string' &&
  url.trim().length > 0 ? url.trim() : false;

helpers.validateMethod = method => typeof method === 'string' &&
  ['post', 'get', 'put', 'delete'].includes(method) ? method : false;

helpers.validateSuccessCodes = successCodes => typeof successCodes === 'object' &&
  Array.isArray(successCodes) && successCodes.length > 0 ? successCodes : false;

helpers.validateTimeoutSeconds = timeoutSeconds => typeof timeoutSeconds === 'number' &&
  timeoutSeconds % 1 === 0  &&
  timeoutSeconds >= 1 && timeoutSeconds <= 5 ?
  timeoutSeconds : false;

helpers.validateState = state => typeof state === 'string' &&
  ['up', 'down'].includes(state) ? state : 'down';

helpers.validateLastChecked = lastChecked => typeof lastChecked === 'number' &&
  lastChecked > 0 ? lastChecked : false;

helpers.validateUserChecks = userChecks => typeof userChecks === 'object' &&
  Array.isArray(userChecks) && userChecks.length > 0 ? userChecks : [];

// Create string of random alphanumeric characters of given length
helpers.createRandomString = length => {
  const validLength = typeof length === 'number' && length > 0 ? length : false;

  if (validLength) {
    let possibleCharacters = 'abcdefghijklmnopqrstuvwxyz1234567890';
    let returnStr = '';

    for (let i=0; i<validLength; i++){
      let randomChar = possibleCharacters.charAt(Math.floor(Math.random() * possibleCharacters.length));
      returnStr += randomChar;
    }

    return returnStr;

  } else {
    return false;
  }
}

// Parse a JSON string to an object in  all cases, without throwing
helpers.parseJsonToObject = str => {
  try {
    const obj = JSON.parse(str);
    return obj;
  } catch (error){
    return {'Error': error}
  };
}

// Determine if a file is of provided type, aka ends with provided string
helpers.isFileType = (fileName, fileSuffix) => {
  const sliceIndex = fileName.length - fileSuffix.length;
  const slicedSuffix = fileName.slice(sliceIndex);
  return slicedSuffix === fileSuffix;
};


// Send a message via Twilio SMS
helpers.sendSMS = (phone, msg, callback) => {
  const validPhone = typeof phone === 'string' && phone.length === 10 ? phone.trim() : false;
  const validMsg = typeof msg === 'string' && msg.trim().length && msg.trim().length <= 1600 ? msg.trim() : false;

  if (validPhone && validMsg){
    // Configure the request payload
    const payload = {
      'From' : config.twilio.fromPhone,
      'To' : `+1${validPhone}`,
      'Body' : validMsg
    }

    // Stringify the payload
    const stringPayload = querystring.stringify(payload);

    // Configure Request details
    const requestDetails = {
      'protocol' : 'https:',
      'hostname' : 'api.twilio.com',
      'method' : 'POST',
      'path'  : `/2010-04-01/Accounts/${config.twilio.accountSid}/Messages.json`,
      'auth' : `${config.twilio.accountSid}:${config.twilio.authToken}`,
      'headers' : {
        'Content-Type' : 'application/x-www-form-urlencoded',
        'Content-Length' : Buffer.byteLength(stringPayload)
      }
    };

    // Instantiate request object
    const req = https.request(requestDetails, res => {
      // Get status of the sent request
      const { statusCode } =  res;
      // Callback successfully if the request went through
      if (statusCode === 200 || statusCode === 201){
        callback(false);
      } else {
        callback(`Status code returned was ${statusCode}`);
      }
    });

    // Bind to the error event so it doesn't get thrown
    req.on('error', e => {
      callback(e);
    });

    // Add the payload
    req.write(stringPayload);

    // End the request / Send it
    req.end();

  } else {
    callback('Given parameters were missing or invalid.')
  }
}


module.exports = helpers;
