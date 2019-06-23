/*
*
* Workers module
*/

// Dependencies
const fs = require('fs');
const http = require('http');
const https = require('https');
const path = require('path');
const url = require('url');

const _data = require('./data')
const helpers = require('./helpers');
const _logs = require('./logs');

// Instantiate workers object
const workers = {};


// Lookup all the checks, get their data, then send to a validator
workers.gatherAllChecks = () => {
  // get all the checks
  _data.list('checks', (err, foundChecks) => {
    if (!err && foundChecks && foundChecks.length){
      foundChecks.forEach(check => {
        // Read the check data
        _data.read('checks', check, (err, originalCheckData) => {
          if (!err && originalCheckData){
            // Pass the check data to the validator to execute check
            workers.validateCheckData(originalCheckData)
          } else {
            console.log('Error reading one of the check\'s data.')
          }
        })
      })
    } else {
      console.log('Error: Could not find any checks to process.')
    }
  })
}

// Checking the pulled check data for validity
workers.validateCheckData = foundCheckData => {
  const checkDataObject = typeof foundCheckData === 'object' && foundCheckData !== null ? foundCheckData : {};
  // validate and assign found checkData properties before performing check
  checkDataObject.id = helpers.validateId(foundCheckData.id);
  checkDataObject.userPhone = helpers.validatePhone(foundCheckData.userPhone);
  checkDataObject.method = helpers.validateMethod(foundCheckData.method);
  checkDataObject.protocol = helpers.validateProtocol(foundCheckData.protocol);
  checkDataObject.successCodes = helpers.validateSuccessCodes(foundCheckData.successCodes);
  checkDataObject.timeoutSeconds = helpers.validateTimeoutSeconds(foundCheckData.timeoutSeconds);

  // set additional keys if not already there
  checkDataObject.state = helpers.validateState(foundCheckData.state);
  checkDataObject.lastChecked = helpers.validateLastChecked(foundCheckData.lastChecked);

  // if all the checks pass, pass data to next step
  if ( checkDataObject.id &&
    checkDataObject.userPhone &&
    checkDataObject.method &&
    checkDataObject.protocol &&
    checkDataObject.successCodes &&
    checkDataObject.timeoutSeconds &&
    checkDataObject.url
  ) {
    workers.performCheck(checkDataObject);

  } else {
    console.log('Error: One of the checks not properly formatted, and it\'s being skipped.');
  }
};

// Perform check, then send originalCheckData and result
workers.performCheck = originalCheckData => {
  // Prepare the initial check outcome
  const checkOutcome = {
    error: false,
    responseCode: false
  };

  // Flag that outcome not yet sent
  let outcomeSent = false;

  // Parse the host name and path
  const parsedUrl = url.parse(`${originalCheckData.protocol}://${originalCheckData.url}`, true)
  // Get host name and path with query string
  const {hostname, path} = parsedUrl;

  // Construct request
  const requestDetails = {
    protocol: `${originalCheckData.protocol}:`,
    hostname,
    method: originalCheckData.method.toUpperCase(),
    path,
    timeout: originalCheckData.timeoutSeconds * 1000
  };

  // Instantiate the request object using http or https modules
  const _moduleToUse = originalCheckData.protocol === 'http' ? http : https;
  const req = _moduleToUse.request(requestDetails, res => {
    // Grab the status of the sent us
    const { statusCode } = res;
    // Update the checkOutcome with it
    checkOutcome.responseCode = statusCode;
    // If not sent, pass it along
    if (!outcomeSent){
      workers.processCheckOutcome(originalCheckData, checkOutcome);
      outcomeSent = true;
    }
  });

  // Bind to Error even so it won't get thrown
  req.on('error', err => {
    // Update the checkOutcome and pass data along
    checkoutCome.error = {
      error: true,
      value: err
    };

    if (!outcomeSent){
      workers.processCheckOutcome(originalCheckData, checkOutcome);
      outcomeSent = true;
    }
  });

    // Bind to Timeout to capture those errors
    req.on('timeout', err => {
      // Update the checkOutcome and pass data along
      checkoutCome.error = {
        error: true,
        value: 'timeout'
      };

      if (!outcomeSent){
        workers.processCheckOutcome(originalCheckData, checkOutcome);
        outcomeSent = true;
      }
    });

    // Send the request
    req.end();
};

// Process the check outcome and update the check data as needed and trigger alerts
// Special edge case for check never tested before, no status alerts for brand new checks
workers.processCheckOutcome = (originalCheckData, checkoutCome) => {
  // Determine if the check is up or down
  const state = !checkoutCome.error && checkoutCome.responseCode && originalCheckData.successCodes.includes(checkoutCome.responseCode) ? 'up' : 'down';

  // Need an alert? Check for diff and actually having been run before, not just first time starting
  const alertNeeded = originalCheckData.lastChecked && originalCheckData.state !== state ? true : false;

  // Log the outcome
  const timeOfCheck = Date.now();
  workers.log(
    originalCheckData,
    checkoutCome,
    state,
    alertNeeded,
    timeOfCheck
  );

  // Update the check data
  const newCheckData = originalCheckData;
  newCheckData.state = state;
  newCheckData.lastChecked = timeOfCheck;


  // Save updated check
  _data.update('checks', newCheckData.id, newCheckData, err => {
    if (!err){
      if (alertNeeded){
        workers.alertUserToStatusChange(newCheckData);
      } else {
        console.log('Check outcome unchanged; No alert.')
      }
    } else {
      console.log('Error updating one of the checks.')
    }
  })
};

// Send the SMS for status changes on check status
workers.alertUserToStatusChange = newCheckData => {
  const msg = `Alert: Your check for ${newCheckData.method.toUpperCase()} ${newCheckData.protocol}://${newCheckData.url} is currently ${newCheckData.state.toUpperCase()}.`;
  helpers.sendSMS(
    newCheckData.userPhone,
    msg,
    error => {
      if (!error){
        console.log(`Success: SMS alert for check status change sent to user as: ${msg}`);
      } else {
        console.log(`Error: SMS alert failed. Attempted to send this message to user: ${msg}`);
      }
    }
  );
};

// Timer to execute worker process once per minute
workers.loop = () => {
  setInterval(() => {
    workers.gatherAllChecks();
  }, 1000 * 60)

}

workers.log = (originalCheckData, checkoutCome, state, alertNeeded, timeOfCheck) => {
  // form the log data
  const logData = {
    check: originalCheckData,
    outcome: checkoutCome,
    state,
    alert: alertNeeded,
    time: timeOfCheck
  };

  // Stringify the object to JSON
  const logString = JSON.stringify(logData);

  // Write the name of the new file
  const logFileName = originalCheckData.id;

  // then append the file
  _logs.append(logFileName, logString, err => {
    if (!err){
      console.log('Logging to file succeeded.');
    } else {
      console.log('Logging to file failed.');
    }
  });
}

// Rotate (compress) log files
workers.rotateLogs = () => {
  // List (boolean parameter): noncompressed log files
  _logs.list(false,  (err, logs) => {
    if (!err){
      logs.forEach(logName => {
        // compress data to a new file
        const logId = Number(logName.replace('log', ''));
        const newFileId = `${logId}-${Date.now()}`;
        _logs.compress(logId, newFileId, err => {
          if (!err){
            // Truncate the file after compressing its contents
            _logs.truncate(logId, err => {
              if (!err){
                console.log('Success truncating log file.');
              } else {
                console.log('Error truncating log file.');
              }
            })
          } else {
            console.log('Error compressing one of the log files: ', err);
          }
        })
      })
    } else {
      console.log('Error: Could not find any logs to rotate.')
    }
  });

}

// Timer to rotate logs daily
workers.logRotationLoop = () => {
  setInterval(() => {
    workers.rotateLogs();
  }, 1000 * 60 * 60 * 24)
}

workers.init = () => {
  // Execute all the checks
  workers.gatherAllChecks();

  // Iterate continuous checking
  workers.loop();

  // Compress all logs at start up
  workers.rotateLogs();

  // Iterate for compressing later
  workers.logRotationLoop();
}

// Export worker object
module.exports = workers;
