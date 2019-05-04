/*
Request Handlers
*/

// Dependencies
const _data = require('./data');
const helpers = require('./helpers');

// Define the handlers
const handlers = {};

// Users
handlers.users = function(data, callback){
  var acceptableMethods = ['post', 'get', 'put', 'delete'];

  if (acceptableMethods.includes(data.method)){
    handlers._users[data.method](data, callback);

  } else {
    callback(405); // method not allowed
  };
};

handlers._users = {};

// Post Users
handlers._users.post = function(data, callback){
  // check for required fields
  const { payload } = data;
  const firstName = typeof payload.firstName == 'string' &&
    payload.firstName.trim().length > 0 ? payload.firstName.trim() : false;
  const lastName = typeof payload.lastName == 'string' &&
    payload.lastName.trim().length > 0 ? payload.lastName.trim() : false;
  const phone = typeof payload.phone == 'string' &&
    payload.phone.trim().length == 10 ? payload.phone.trim() : false;
  const password = typeof payload.password == 'string' &&
    payload.password.trim().length > 0 ? payload.password.trim() : false;
  const tosAgreement = typeof payload.tosAgreement == 'boolean' &&
    payload.tosAgreement == true ? true : false;

  if (firstName && lastName && phone && password && tosAgreement){
    // check for user being new by checking for its file in data/users
    _data.read('users', phone, function(err, data){
      if (err){
        // All clear; User doesn't exist and we can create user file
        // Hash the password
        const hashedPassword = helpers.hash(password);

        if (hashedPassword) {
          // Create the user object
          const userObj = {
            firstName,
            lastName,
            phone,
            hashedPassword,
            'tosAgreement': true
          };

          // Store user object
          _data.create('users', phone, userObj, function(err){
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
handlers._users.get = function(data, callback){
  // Check that phone is valid
  const { phone } = data.queryStringObject || false;
  const isPhone = typeof phone == 'string' && phone.trim().length == 10 ? phone.trim() : false;

  if (isPhone){
    // Find user
    _data.read('users', isPhone, function(err, data){
      if (!err && data){
        // remove hashed password before returning found user
        delete data.hashedPassword;
        callback(200, data);
      } else {
        callback(404);
      }
    });

  } else {
    callback(400, {'Error': 'Missing required field'})
  }

};

// Delete Users
// TODO: Only let authenticated users delete their own account
handlers._users.delete = function(data, callback){
  // Check that phone is valid
  const { phone } = data.queryStringObject || false;
  const isPhone = typeof phone == 'string' && phone.trim().length == 10 ? phone.trim() : false;

  if (isPhone){
    // Find user
    _data.read('users', isPhone, function(err, data){
      if (!err && data){
        _data.delete('users', isPhone, function(err, data){
          if (!err && data){
            callback(200);
          } else {
            callback(404, {'Error': 'Error deleting user.'});
          };

        });

      } else {
        callback(400, {'Error': 'Missing required field'})
      }

    });
  };
};

// Put Users
handlers._users.put = function(data, callback){

};


// Sample handler
handlers.ping = function(date, callback) {
  // Callback an http status code, and a payload object
  callback(200, {'pinged': 'Server ping successful.'});
};

// Not found handler
handlers.notFound = function(data, callback) {
  callback(404);
};


module.exports = handlers;
