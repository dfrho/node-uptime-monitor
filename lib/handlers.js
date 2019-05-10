/*
Request Handlers
*/

// Dependencies
const _data = require('./data');
const helpers = require('./helpers');
const config = require('../config');

// Define the handlers
const handlers = {};

/*
Users Method Routing
 */
handlers.users = (data, callback) => {
  var acceptableMethods = ['post', 'get', 'put', 'delete'];

  if (acceptableMethods.includes(data.method)) {
    handlers._users[data.method](data, callback);
  } else {
    callback(405); // method not allowed
  }
};

handlers._users = {};

/*
Post Users Handler
 */

 // Required Data: phone, firstName, lastName, password, tosAgreement
 // Optional Data: none
handlers._users.post = (data, callback) => {
  // check for required fields
  const { phone, firstName, lastName, password, tosAgreement } = data.payload;
  const validPhone = helpers.validatePhone(phone);
  const validFirstName =
    typeof firstName == 'string' && firstName.trim().length > 0
      ? firstName.trim()
      : false;
  const validLastName =
    typeof lastName == 'string' && lastName.trim().length > 0
      ? lastName.trim()
      : false;
  const validPassword =
    typeof password == 'string' && password.trim().length > 0
      ? password.trim()
      : false;
  const validTosAgreement =
    typeof tosAgreement == 'boolean' && tosAgreement == true ? true : false;

  if (validFirstName && validLastName && validPhone && validPassword && validTosAgreement) {
    // check for user being new by checking for its file in data/users
    _data.read('users', phone, (err, data) => {
      if (err) {
        // All clear; User doesn't exist and we can create user file
        // Hash the password
        const hashedPassword = helpers.hash(password);

        if (hashedPassword) {
          // Create the user object
          const userObj = {
            firstName: validFirstName,
            lastName: validLastName,
            phone: validPhone,
            hashedPassword,
            tosAgreement: true
          };

          // Store user object
          _data.create('users', validPhone, userObj, err => {
            if (!err) {
              callback(200);
            } else {
              console.log(err);
              callback(500, { Error: 'Could not create new user.' });
            }
          });
        } else {
          callback(500, { Error: 'Could not hash password.' });
        }
      } else {
        // User already exists
        callback(400, {
          Error: 'A user with that phone number already exists.'
        });
      }
    });
  } else {
    callback(400, { Error: 'Missing required field(s).' });
  }
};

/*
Get Users Handler
 */

 // Required Data: phone
 // Optional Data: none
handlers._users.get = (data, callback) => {
  // Check that phone is valid
  const { phone } = data.queryStringObject || false;
  const validPhone = helpers.validatePhone(phone);

  if (validPhone) {
    // Get the token from the headers and validate it
    const { token } = data.headers || false;
    const validToken = helpers.validateToken(token);

    // Verify that the given token is valid for the phone number
    handlers._tokens.verifyToken(validToken, validPhone, userTokenValidated => {
      if (userTokenValidated) {
        // Find user
        _data.read('users', validPhone, (err, data) => {
          if (!err && data) {
            // remove hashed password before returning found user
            delete data.hashedPassword;
            callback(200, data);
          } else {
            callback(404);
          }
        });
      } else {
        callback(403, {
          Error:
            'Missing required token in header or supplied token is invalid.'
        });
      }
    });
  } else {
    callback(400, { Error: 'Missing required field.' });
  }
};

/*
Put Users Handler
 */

// Required Data: phone
// Required at least one of firstName, lastNme, password
handlers._users.put = (data, callback) => {
  // Check that phone is valid
  const { firstName, lastName, password, phone } = data.payload || false;
  const validPhone = helpers.validatePhone(phone);

  // Check for optional fields
  const validFirstName =
    typeof firstName == 'string' && firstName.trim().length > 0
      ? firstName.trim()
      : false;
  const validLastName =
    typeof lastName == 'string' && lastName.trim().length > 0
      ? lastName.trim()
      : false;
  const validPassword =
    typeof password == 'string' && password.trim().length > 0
      ? password.trim()
      : false;

  if (validPhone) {
    if (validFirstName || validLastName || validPassword) {
      // Get token from headers and validate it
      const { token } = data.headers || false;
      const validToken = helpers.validateToken(token);

      // Verify that given token is valid for phone number
      handlers._tokens.verifyToken(validToken, validPhone, userTokenValidated => {
        if (userTokenValidated) {
          // find user
          _data.read('users', validPhone, (err, userData) => {
            if (!err && userData) {
              // Update provided fields
              if (validFirstName) {
                userData.firstName = validFirstName;
              }
              if (validLastName) {
                userData.lastName = validLastName;
              }
              if (validPassword) {
                userData.hashedPassword = helpers.hash(validPassword);
              }

              // Then store object
              _data.update('users', validPhone, userData, err => {
                if (!err) {
                  callback(200);
                } else {
                  console.log(err);
                  callback(500, { Error: 'Could not update the user data.' });
                }
              });
            } else {
              callback(400, { Error: 'The specified user does not exist.' });
            }
          });
        } else {
          callback(403, {
            Error:
              'Missing required token in header or supplied token is invalid.'
          });
        }
      });
    } else {
      callback(400, { Error: 'Missing field(s) to update.' });
    }
  } else {
    callback(400, { Error: 'Missing required field.' });
  }
};

/*
Delete Users Handler
 */

// Only let authenticated users delete their own account
// Delete files associated with this user
handlers._users.delete = (data, callback) => {
  // Check that phone is valid
  const { phone } = data.queryStringObject || false;
  const validPhone = helpers.validatePhone(phone);

  if (validPhone) {
    // Get token from headers and validate it
    const { token } = data.headers || false;
    const validToken = helpers.validateToken(token);

    // Verify that given token is valid for phone number
    handlers._tokens.verifyToken(validToken, validPhone, userTokenValidated => {
      if (userTokenValidated) {
        // Find user
        _data.read('users', validPhone, (err, data) => {
          if (!err && data) {
            _data.delete('users', validPhone, err => {
              if (!err) {
                callback(200);
              } else {
                callback(500, {
                  Error: 'Could not delete the specified user.'
                });
              }
            });
          } else {
            callback(400, { Error: 'Could not find the specified user.' });
          }
        });
      } else {
        callback(403, {
          Error:
            'Missing required token in header or supplied token is invalid.'
        });
      }
    });
  } else {
    callback(400, { Error: 'Missing required field.' });
  }
};

/*
Tokens Method Routing
 */
handlers.tokens = (data, callback) => {
  var acceptableMethods = ['post', 'get', 'put', 'delete'];

  if (acceptableMethods.includes(data.method)) {
    handlers._tokens[data.method](data, callback);
  } else {
    callback(405); // method not allowed
  }
};

// Container for tokens methods
handlers._tokens = {};

/*
Post Tokens Handler
 */

// Required Data: phone, password
// Optional Data: none
handlers._tokens.post = (data, callback) => {
  // check for required fields
  const { phone, password } = data.payload;
  const validPhone = helpers.validatePhone(phone);
  const validPassword =
    typeof password == 'string' && password.trim().length > 0
      ? password.trim()
      : false;

  if (validPhone && validPassword) {
    // Find user matched to phone
    _data.read('users', validPhone, (err, userData) => {
      if (!err && userData) {
        //compare hashed passwords
        if (helpers.hash(validPassword) == userData.hashedPassword) {
          // Create token with random name, expiring one hour
          const tokenId = helpers.createRandomString(20);
          const expires = Date.now() + 1000 * 60 * 60;
          const tokenObj = {
            phone: validPhone,
            id: tokenId,
            expires
          };

          // create the token
          _data.create('tokens', tokenId, tokenObj, err => {
            if (!err) {
              callback(200, tokenObj);
            } else {
              callback(500, { Error: 'Could not create new token.' });
            }
          });
        } else {
          callback(400, {
            Error: "Password did not match the user's password."
          });
        }
      } else {
        callback(400, { Error: 'Could not find the specified user.' });
      }
    });

    // Match user to password
  } else {
    callback(400, { Error: 'Missing required field(s).' });
  }
};

/*
Get Tokens Handler
 */

// Required Data: id
handlers._tokens.get = (data, callback) => {
  // Check that id is valid
  const { id } = data.queryStringObject || false;
  const validId = helpers.validateId(id);

  if (validId) {
    // Find token
    _data.read('tokens', validId, (err, tokenData) => {
      if (!err && tokenData) {
        callback(200, tokenData);
      } else {
        callback(404);
      }
    });
  } else {
    callback(400, { Error: 'Missing required field.' });
  }
};

/*
Put Token Handler
 */

// Required Data: id, extend
// Optional Data: none
handlers._tokens.put = (data, callback) => {
  // Check that id is valid and extend is true
  const { extend, id } = data.payload || false;
  const validId = helpers.validateId(id);
  const validExtend = helpers.validateExtend(extend);

  if (validId && validExtend) {
    // Find token and extend it
    _data.read('tokens', validId, (err, tokenData) => {
      if (!err && tokenData) {
        // check to ensure it is not expired
        const notExpired = tokenData.expires > Date.now();

        if (notExpired) {
          tokenData.expires = Date.now() + 1000 * 60 * 60;

          _data.update('tokens', validId, tokenData, err => {
            if (!err) {
              callback(200);
            } else {
              callback(500, {
                Error: "Could not update the token's expiration"
              });
            }
          });
        } else {
          callback(400, {
            Error: 'The token is already expired and cannot be extended.'
          });
        }
      } else {
        callback(400, { Error: 'Specified token does not exist.' });
      }
    });
  } else {
    callback(400, { Error: 'Missing required field or fields are invalid.' });
  }
};

/*
Delete Token Handler
 */

// Required Data: id
// Optional Data: none
handlers._tokens.delete = (data, callback) => {
  // Check that id is valid
  const { id } = data.queryStringObject || false;
  const validId = helpers.validateId(id);

  if (validId) {
    // Find user
    _data.read('tokens', validId, (err, data) => {
      if (!err && data) {
        _data.delete('tokens', validId, err => {
          if (!err) {
            callback(200);
          } else {
            callback(500, { Error: 'Could not delete the specified token.' });
          }
        });
      } else {
        callback(400, { Error: 'Could not find the specified token.' });
      }
    });
  } else {
    callback(400, { Error: 'Missing required field.' });
  }
};


/*
Verify Token Handler
 */

// Verify if a given token id is valid for a given user
handlers._tokens.verifyToken = (id, phone, callback) => {
  //Lookup the token
  _data.read('tokens', id, (err, tokenData) => {
    if (!err && tokenData) {
      // Check that token is that of given user and is not expired
      if (tokenData.phone == phone && tokenData.expires > Date.now()) {
        callback(true);
      } else {
        callback(false);
      }
    } else {
      callback(false);
    }
  });
};

/*
Checks Method Routing
 */
handlers.checks = (data, callback) => {
  var acceptableMethods = ['post', 'get', 'put', 'delete'];

  if (acceptableMethods.includes(data.method)) {
    handlers._checks[data.method](data, callback);
  } else {
    callback(405); // method not allowed
  }
};

// Container for checks methods
handlers._checks = {};

/*
Post Checks
 */

// Required Data: protocol, url, method, successCodes, timeoutSeconds
// Optional Data: none
handlers._checks.post = (data, callback) => {
  // Validate all inputs
  const { method, protocol, successCodes, timeoutSeconds, url } = data.payload;
  const validProtocol = helpers.validateProtocol(protocol);
  const validUrl = helpers.validateUrl(url);
  const validMethod = helpers.validateMethod(method);
  const validSuccessCodes = helpers.validateSuccessCodes(successCodes);
  const validTimeoutSeconds = helpers.validateTimeoutSeconds(timeoutSeconds);

  // If inputs are valid
  if (
    validProtocol &&
    validUrl &&
    validMethod &&
    validSuccessCodes &&
    validTimeoutSeconds
    ) {
    // check if user is validated by checking token
    // get token from headers object
    const { token } = data.headers;
    const validToken = helpers.validateToken(token);

    // Look up user by reading the token
    _data.read('tokens', validToken, (err, tokenData) => {
      if (!err && tokenData) {
        // find user
        const { phone } = tokenData;

        _data.read('users', phone, (err, userData) => {
          if (!err && userData) {
            const validUserChecks = helpers.validateUserChecks(userData.checks);

            if (validUserChecks.length < config.maxChecks) {
              // Create randome id for new check
              const checkId = helpers.createRandomString(20);

              // Create the check object with user phone, nSQL, non-relational pattern
              const checkObject = {
                id: checkId,
                userPhone: phone,
                protocol: validProtocol,
                url: validUrl,
                method: validMethod,
                successCodes: validSuccessCodes,
                timeoutSeconds: validTimeoutSeconds
              };

              // Save new check object
              _data.create('checks', checkId, checkObject, err => {
                if (!err) {
                  // Replace userData's checks array with the new one
                  userData.checks = validUserChecks;
                  userData.checks.push(checkId);

                  // Save the new uesr data
                  _data.update('users', phone, userData, err => {
                    if (!err) {
                      callback(200, checkObject);
                    } else {
                      callback(500, {
                        Error: 'Could not update the user with the new check.'
                      });
                    }
                  });
                } else {
                  callback(500, { Error: 'Could not create the new check.' });
                }
              });
            } else {
              callback(400, {
                Error: `User already has the maximum number of checks: ${
                  config.maxChecks
                }.`
              });
            }
          } else {
            callback(403);
          }
        });
      } else {
        callback(403);
      }
    });
  } else {
    callback(400, { Error: 'Missing or invalid required inputs.' });
  }
};

/*
Get Checks Handler
 */

// Required Data: id
// Optional Data: none
handlers._checks.get = (data, callback) => {
  // Check that phone is valid
  const { id } = data.queryStringObject || false;
  const validId = helpers.validateId(id);

  if (validId) {
    // Look up the check
    _data.read('checks', validId, (err, checkData) => {
      if (!err && checkData) {
        // Get the token from the headers and validate it
        const { token } = data.headers || false;
        const validToken = helpers.validateToken(token);

        // Verify that the given token is valid for user who created check
        handlers._tokens.verifyToken(
          validToken,
          checkData.userPhone,
          userTokenValidated => {
            if (userTokenValidated) {
              // Return the check data
              callback(200, checkData);
            } else {
              callback(403);
            }
          }
        );
      } else {
        callback(404);
      }
    });
  } else {
    callback(400, { Error: 'Missing required field.' });
  }
};

/*
Put Checks Handler
 */

// Required Data: id
// Optional Data: protocol, method, url, successCodes, timeoutSeconds (at least one)
handlers._checks.put = (data, callback) => {
  // check for required ID field
  const { id } = data.payload;
  const validId = helpers.validateId(id);
  // Validate inputs
  const { method, protocol, successCodes, timeoutSeconds, url } = data.payload;
  const validProtocol = helpers.validateProtocol(protocol);
  const validUrl = helpers.validateUrl(url);
  const validMethod = helpers.validateMethod(method);
  const validSuccessCodes = helpers.validateSuccessCodes(successCodes);
  const validTimeoutSeconds = helpers.validateTimeoutSeconds(timeoutSeconds);
  // Validate at least one valid input
  const minimumInputs =
    validProtocol ||
    validUrl ||
    validMethod ||
    validSuccessCodes ||
    validTimeoutSeconds;
  // Validate if any invalid inputs
  // const anyInvalidInputs = [validProtocol, validUrl, validMethod, validSuccessCodes, validTimeoutSeconds].some(element => element == false)

  // check for valid id and one or more fields sent
  if (validId && minimumInputs) {
    // Lookup the check
    _data.read('checks', id, (err, checkData) => {
      if (!err && checkData) {
        // Get the token from the headers and validate it
        const { token } = data.headers || false;
        const validToken = helpers.validateToken(token);

        // Verify that the given token is valid for user who created check
        handlers._tokens.verifyToken(
          validToken,
          checkData.userPhone,
          userTokenValidated => {
            if (userTokenValidated) {
              // Update the check where input provided
              const revisedCheckData = {
                protocol: validProtocol || protocol,
                url: validUrl || url,
                method: validMethod || method,
                successCodes: validSuccessCodes || successCodes,
                timeoutSeconds: validTimeoutSeconds || timeoutSeconds
              };

              // Save the check
              _data.update('checks', validId, revisedCheckData, err => {
                if (!err) {
                  callback(200);
                } else {
                  callback(500, { Error: 'Could not update the check.' });
                }
              });
            } else {
              callback(403);
            }
          }
        );
      } else {
        callback(400, { Error: 'Check ID does not exist.' });
      }
    });

  } else {
    callback(200, { Error: 'Missing valid check id or one of required fields to update.' });
  }
};

/*
Delete Checks Handler
 */

// Only allow authorized users with valid token in header to delete
// their own checks.
// Required fields: (check) ID
// Optional fields: none

handlers._checks.delete = (data, callback) => {
  // Check that phone is valid
  const { id } = data.queryStringObject || false;
  const validId = helpers.validateId(id);

  if (validId) {
    // Get token from headers and validate it
    const { token } = data.headers || false;
    const validToken = helpers.validateToken(token);

    // Verify that given token is valid for phone number
    if (validToken) {
      // Find user
      _data.read('checks', validId, (err, checkData) => {
        if (!err && checkData) {
          handlers._tokens.verifyToken(
            validToken,
            checkData.userPhone,
            userTokenValidated => {
              if (userTokenValidated) {
                _data.delete('checks', validId, err => {
                  if (!err) {
                    callback(200);
                  } else {
                    callback(500, {
                      Error: 'Could not delete the specified check.'
                    });
                  }
                });
              } else {
                callback(500, {
                  Error: 'Could not validate user for this operation.'
                });
              }
            }
          );
        } else {
          callback(400, { Error: 'Could not find the specified check.' });
        }
      });
    } else {
      callback(400, { Error: 'Missing required field.' });
    }
  }
};

/*
Test Handler
 */

handlers.ping = (data, callback) => {
  // Callback an http status code, and a payload object
  callback(200, { pinged: 'Server ping successful.' });
};

/*
Not Found Checks Handler
 */

handlers.notFound = (data, callback) => {
  callback(404);
};

module.exports = handlers;
