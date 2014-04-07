'use strict';

var fs       = require('fs');
var pg       = require('pg');
var strftime = require('strftime');
var runner   = require('./runner');

exports.create = function create(name) {
  if (!name) throw new Error('Error: Must supply migration name');

  var now       = new Date,
      utc       = new Date(now.getTime() + (now.getTimezoneOffset() * 60000)),
      timestamp = strftime('%Y%m%d%H%M%S', utc),
      fullName  = timestamp + '-' + name + '.sql';

  fs.writeFile('./migrations/' + fullName, migrationTemplate(), function (err) {
    if (err) return console.log('Error: Could not create migration file');

    console.log('Created: ' + fullName);
  })

  function migrationTemplate () {
    return [
      "-- MIGRATE-UP! --\n\n",
      "-- MIGRATE-DOWN! --"
    ].join('');
  }
};

exports.change = function change(count, direction) {
  var client = new pg.Client(process.env.DATABASE_URL);
  client.connect(beginQuery);

  function beginQuery(err) {
    if (err) throw err;
    client.query('BEGIN;', performQuery);
  }

  function performQuery(err) {
    if (err) throw err;
    runner.run(client, count, direction, commitQuery);
  }

  function commitQuery(err) {
    if (err) throw err;
    client.query('COMMIT;', endQuery);
  }

  function endQuery(err) {
    if (err) throw err;
    client.end();
  }
};
