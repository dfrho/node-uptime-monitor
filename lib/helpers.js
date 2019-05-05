/*
Helpers
*/

// Dependencies
const crypto = require('crypto');
const config = require('../config');

const helpers = {};

// Create a SHAD512 hash
helpers.hash = str => {
  if (typeof str == 'string' && str.length > 0){
    const hash = crypto.createHmac('sha512', config.hashingSecret).update(str).digest('hex');
    return hash;
  } else {
    return false;
  }
}

helpers.validatePhone = phone => typeof phone == 'string' && phone.trim().length == 10 ? phone.trim() : false;

helpers.validateId = id => typeof id == 'string' && id.trim().length == 20 ? id.trim() : false;

// Create string of random alphanumeric characters of given length
helpers.createRandomString = length => {
  const validLength = typeof length == 'number' && length > 0 ? length : false;

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




module.exports = helpers;
