/*
*Library for storing and refreshing logs
*
*/

// Dependencies
const fs = require('fs');
const path = require('path');
const zlib = require('zlib');
const helpers = require('./helpers');

// Container for exporting module
const lib = {};

// Base directory of logs folder
lib.baseDir = path.join(__dirname,'/../.logs/');

// Create Or Update Log: Append a string to a file. Or create file if does not exist
lib.append = (logFileName, logString, callback) => {
  // Open file for appending
  fs.open(`${lib.baseDir}${logFileName}.log`, `a`, (err, fileDescriptor) => {
    if (!err && fileDescriptor){
      fs.appendFile(fileDescriptor, `${logString}\n`, err => {
        if (!err){
          fs.close(fileDescriptor, err => {
            if (!err){
              callback(false)
            } else {
              callback('Error closing file that was appended.')
            }
          })
        } else {
          callback('Error appending to file.')
        }
      })
    } else {
      callback('Could not open file for appending.')
    }
  });
};

// List all the logs with an option to include the compressed logs
lib.list = (includeCompressedLogs, callback) => {
  fs.readdir(lib.baseDir, (err, dirData) => {
    if (!err && dirData.length){
      const trimmedFileNames = [];
      dirData.forEach(fileName => {
        const isLogFile = helpers.isFileType(fileName, '.log');
        const isZipFile = helpers.isFileType(fileName, '.gz.b64');

        if (isLogFile){
          trimmedFileNames.push(fileName.replace('.log', ''));
        }

        if (isZipFile && includeCompressedLogs){
          trimmedFileNames.push(fileName.replace('.gz.b64', ''));
        }

        callback(false, trimmedFileNames);
      })

    } else {
      callback(`Error reading log list in directory ${lib.baseDir}: ${err}`, dirData)
    }
  })
};

// Compress the contents of a provided file into a .gz.b64 file in the same directory
lib.compress = (logId, newFileId, callback) => {
  const sourceFile = `${logId}.log`;
  const destFile = `${newFileId}.gz.b64`;

  // Open raw log file to be compressed
  fs.readFile(`${lib.baseDir}${sourceFile}`, `utf8`, (err, inputString) => {
    if (!err && inputString){
      // Feed resulting string to gzip method for compression
      zlib.gzip(inputString, (err, buffer) => {
        if (!err && buffer){
          // open the file in edit mode
          fs.open(`${lib.baseDir}${destFile}`, `wx`, (err, fileDescriptor) => {
            if (!err && fileDescriptor){
              fs.writeFile(fileDescriptor, buffer.toString('base64'), err => {
                if (!err){
                  fs.close(fileDescriptor, err => {
                    if (!err){
                      callback(false);
                    } else {
                      callback(err);
                    }
                  })
                } else {
                  callback(err);
                }
              })
            } else {
              callback(err);
            }
          })
        } else {
          callback(err);
        }
      })
    } else {

    }
  })
};

// Decompress the file into a string
lib.decompress = (fileId, callback) => {
  const fileName = `${lib.baseDir}${fileId}`
}

lib.truncate = (fileId, callback) => {
  const fileName = `${lib.baseDir}${fileId}`
  fs.ftruncate(`${fileName}.log`, 0, (err) => {
    if (!err){
      callback(false);
    } else {
      callback(err);
    }
  });
}

module.exports = lib;
