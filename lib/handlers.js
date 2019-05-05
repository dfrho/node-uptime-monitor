/*
Request Handlers
*/

// Dependencies
const _data = require('./data');
const helpers = require('./helpers');

// Define the handlers
const handlers = {};

// Users
handlers.users = (data, callback) => {
  var acceptableMethods = ['post', 'get', 'put', 'delete'];

  if (acceptableMethods.includes(data.method)){
    handlers._users[data.method](data, callback);

  } else {
    callback(405); // method not allowed
  };
};

handlers._users = {};

// Post Users
handlers._users.post = (data, callback) => {
  // check for required fields
  const { phone, firstName, lastName, password, tosAgreement } = data.payload;
  const isPhone = helpers.validatePhone(phone);
  const isFirstName = typeof firstName == 'string' &&
    firstName.trim().length > 0 ? firstName.trim() : false;
  const isLastName = typeof lastName == 'string' &&
    lastName.trim().length > 0 ? lastName.trim() : false;
  const isPassword = typeof password == 'string' &&
    password.trim().length > 0 ? password.trim() : false;
  const isTosAgreement = typeof tosAgreement == 'boolean' &&
    tosAgreement == true ? true : false;

  if (isFirstName && isLastName && isPhone && isPassword && isTosAgreement){
    // check for user being new by checking for its file in data/users
    _data.read('users', phone, (err, data) => {
      if (err){
        // All clear; User doesn't exist and we can create user file
        // Hash the password
        const hashedPassword = helpers.hash(password);

        if (hashedPassword) {
          // Create the user object
          const userObj = {
            firstName: isFirstName,
            lastName: isLastName,
            phone: isPhone,
            hashedPassword,
            tosAgreement: true
          };

          // Store user object
          _data.create('users', isPhone, userObj, err  => {
          if (!err){
            callback(200);

          } else {
            console.log(err);
            callback(500, {'Error': 'Could not create new user.'});
          }
        });

        } else {
          callback(500, {'Error': 'Could not hash password.'})
        }

      } else {
        // User already exists
        callback(400, {'Error': 'A user with that phone number already exists.'});
      }
    });
  } else {
    callback(400, {'Error': 'Missing required field(s).'})
  }

};

// Get Users
// TODO: Only let authenticated users access their own data
handlers._users.get = (data, callback) => {
  // Check that phone is valid
  const { phone } = data.queryStringObject || false;
  const isPhone = helpers.validatePhone(phone);

  if (isPhone){
    // Find user
    _data.read('users', isPhone, (err, data) => {
      if (!err && data){
        // remove hashed password before returning found user
        delete data.hashedPassword;
        callback(200, data);

      } else {
        callback(404);
      }
    });

  } else {
    callback(400, {'Error': 'Missing required field.'})
  }

};

// Put Users
// TODO: Only let authenticated user update their own data
// Required data: phone
// Required at least one of firstName, lastNme, password
handlers._users.put = (data, callback) => {
  // Check that phone is valid
  const { firstName, lastName, password, phone } = data.payload || false;
  const isPhone = helpers.validatePhone(phone);

  // Check for optional fields
  const isFirstName = typeof firstName == 'string' &&
    firstName.trim().length > 0 ? firstName.trim() : false;
  const isLastName = typeof lastName == 'string' &&
    lastName.trim().length > 0 ? lastName.trim() : false;
  const isPassword = typeof password == 'string' &&
    password.trim().length > 0 ? password.trim() : false;

  if (isPhone){
    if (isFirstName || isLastName || isPassword){

      // find user
      _data.read('users', isPhone, (err, userData) => {
        if (!err && userData){
          // Update the fields provided
          if (firstName){
            userData.firstName = firstName;
          };
          if (lastName){
            userData.lastName = lastName;
          };
          if (password){
            userData.hashedPassword = helpers.hash(password);
          };

          // Then Store the object
          _data.update('users', isPhone, userData, err => {
            if (!err){
              callback(200);

            } else {
              console.log(err);
              callback(500, {'Error': 'Could not update the user data.'});
            }
          })

        } else {
          callback(400, {'Error': 'The specified user does not exist.'})
        }
      })

    } else {
      callback(400, {'Error': 'Missing field(s) to update.'});
    }
  } else {
    callback(400, {'Error': 'Missing required field.'})
  }

};


// Delete Users
// TODO: Only let authenticated users delete their own account
// TODO: Delete files associated with this user
handlers._users.delete = (data, callback) => {
  // Check that phone is valid
  const { phone } = data.queryStringObject || false;
  const isPhone = helpers.validatePhone(phone);

  if (isPhone){
    // Find user
    _data.read('users', isPhone, (err, data) => {

      if (!err && data){
        _data.delete('users', isPhone, err => {

          if (!err){
            callback(200);

          } else {
            callback(500, {'Error': 'Could not delete the specified user.'});
          };

        });

      } else {
        callback(400, {'Error': 'Could not find the specified user.'})
      }
    });

  } else {
    callback(400, {'Error': 'Missing required field.'})
  };
};

/*
Tokens
 */
handlers.tokens = (data, callback) => {
  var acceptableMethods = ['post', 'get', 'put', 'delete'];

  if (acceptableMethods.includes(data.method)){
    handlers._tokens[data.method](data, callback);

  } else {
    callback(405); // method not allowed
  };
};

// Container for tokens methods
handlers._tokens = {};

// Post Tokens
// Required data: phone, password
// Optional data: none
handlers._tokens.post = (data, callback) => {
    // check for required fields
    const { phone, password } = data.payload;
    const isPhone = helpers.validatePhone(phone);
    const isPassword = typeof password == 'string' &&
      password.trim().length > 0 ? password.trim() : false;

    if (isPhone && password){
      // Find user matched to phone
      _data.read('users', isPhone, (err, userData) => {
        if (!err && userData){
          //compare hashed passwords
          if (helpers.hash(isPassword) == userData.hashedPassword){
            // Create token with random name, expiring one hour
            const tokenId = helpers.createRandomString(20);
            const expires = Date.now() + 1000 * 60 * 60;
            const tokenObj = {
              phone: isPhone,
              id: tokenId,
              expires
            }

            // create the token
            _data.create('tokens', tokenId, tokenObj, err => {
              if (!err){
                callback(200, tokenObj);
              } else {
                callback(500, {'Error': 'Could not create new token.'})
              }
            })

          } else {
            callback(400, {'Error': 'Password did not match the user\'s password.'});
          }

        } else {
          callback(400, {'Error': 'Could not find the specified user.'})
        }
      })

      // Match user to password
    } else {
      callback(400, {'Error': 'Missing required field(s).'});
    }

};

// Get Tokens
// Required data: id
handlers._tokens.get = (data, callback) => {
  // Check that phone is valid
  const { id } = data.queryStringObject || false;
  const isId = helpers.validateId(id);

  if (isId){
    // Find token
    _data.read('tokens', isId, (err, tokenData) => {
      if (!err && tokenData){
        callback(200, tokenData);

      } else {
        callback(404);
      }
    });

  } else {
    callback(400, {'Error': 'Missing required field.'})
  }

};

// Put Tokens
handlers._tokens.put = (data, callback) => {

};

// Delete Tokens
handlers._tokens.delete = (data, callback) => {

};


// Sample handler
handlers.ping = (data, callback) => {
  // Callback an http status code, and a payload object
  callback(200, {'pinged': 'Server ping successful.'});
};

// Not found handler
handlers.notFound = (data, callback) => {
  callback(404);
};


module.exports = handlers;
