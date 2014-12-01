'use strict';

var async    = require('async');
var fs       = require('fs');
var path     = require('path');
var strftime = require('strftime').strftimeTZ;
var runner   = require('./runner');
var pg       = loadPg();

exports.create = function create(name, migrationDir, cb) {
  var timestamp         = strftime('%Y%m%d%H%M%S', new Date(), '+0000');
  var fullName          = timestamp + '-' + name + '.sql';
  var filePath          = path.join(migrationDir, fullName);
  var migrationTemplate = '-- MIGRATE-UP! --\n\n-- MIGRATE-DOWN! --';

  fs.writeFile(filePath, migrationTemplate, function onWrite(err) {
    if (err) {
      console.error('Error: Could not create a migration file.');
      return cb ? cb(err) : process.exit(1);
    }

    console.log('Created: ' + fullName);
    if (cb) cb(null, fullName);
  });
};

exports.change = function change(count, direction, databaseURL, migrationDir) {
  var client = new pg.Client(databaseURL);
  client.connect(beginQuery);

  async.series([
    beginQuery,
    performQuery,
    commitQuery,
    endQuery
  ], function done(err) {
    if (err) throw err;
  });

  function beginQuery(cb) {
    client.query('BEGIN;', cb);
  }

  function performQuery(cb) {
    runner.run(client, count, direction, migrationDir, cb);
  }

  function commitQuery(cb) {
    client.query('COMMIT;', cb);
  }

  function endQuery() {
    client.end();
  }
};

function loadPg() {
  try {
    return require('pg');
  } catch(err) {
    try {
      return require('pg.js');
    } catch(err) {
      console.error('Error: Neither pg nor pg.js were found.');
      process.exit(1);
    }
  }
}
