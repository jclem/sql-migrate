'use strict';

var fs   = require('fs');
var path = require('path');

exports.run = function run(client, count, direction, cb) {
  getOrCreateMigrationsTable(client, count, direction, cb);
}

function getOrCreateMigrationsTable(client, count, direction, cb) {
  client.query('CREATE TABLE IF NOT EXISTS schema_migrations (full_name varchar NOT NULL);', afterTableFetch);

  function afterTableFetch(err, result) {
    if (err) {
      throw new Error('Error: Could not get or create schema_migrations table');
    }

    runMigrations(client, count, direction, cb);
  }
}

function runMigrations(client, count, direction, cb) {
  getMigrationRows(client, gotMigrationRows);

  function gotMigrationRows(migrationRows) {
    var migrationFiles = getMigrationFiles(direction);
    var lastMigration  = migrationRows[migrationRows.length - 1];
    var migrationNames = migrationFiles.map(function(file) { return file.fullName; });
    var index;

    if (lastMigration) {
      index = migrationNames.indexOf(lastMigration.full_name);

      if (direction === 'up') {
        migrationFiles = migrationFiles.slice(index + 1, migrationFiles.length);
      } else {
        migrationFiles = migrationFiles.slice(0, index + 1).reverse();
      }
    } else {
      if (direction === 'down') {
        migrationFiles = [];
      }
    }

    migrationFiles = count ? migrationFiles.slice(0, count) : migrationFiles;

    if (migrationFiles.length) {
      runMigration(client, migrationFiles, 0, direction, cb);
    } else {
      console.log('No migrations')
      cb();
    }
  }
}

function getMigrationRows(client, cb) {
  client.query('SELECT * FROM schema_migrations ORDER BY full_name ASC', function(err, result) {
    if (err) {
      console.log('Error: Could not get schema migration rows');
    } else {
      cb(result.rows);
    }
  });
}

function getMigrationFiles(direction) {
  var files = fs.readdirSync('./migrations');

  return files.filter(function(file) {

    return +file[0] > 0;

  }).sort(function(fileA, fileB) {

    var fileAStamp = +fileA.split('-')[0];
    var fileBStamp = +fileB.split('-')[0];

    if (fileAStamp > fileBStamp) return 1;
    if (fileAStamp < fileBStamp) return -1;
    return 0;

  }).map(function(file) {

    var contents = fs.readFileSync(path.join(process.cwd(), 'migrations', file));
    var queries  = contents.toString().split(/^-- MIGRATE-(?:UP|DOWN)! --$/m);
    var query    = direction === 'up' ? queries[1] : queries[2];

    return { fullName: file.substr(0, file.length - 3), query: query.trim() };

  });
}

function runMigration(client, migrationFiles, i, direction, cb) {
  var file = migrationFiles[i];
  var query;

  console.log('============================================================');
  console.log('MIGRATION: ' + file.fullName);
  console.log('------------------------------------------------------------');

  client.query(file.query, function(err, result) {
    if (err) {
      console.log('\n' + err + '\n');
      console.log("TRANSACTION ABORTED, ROLLING BACK");
      console.log('============================================================\n\n');
      return cb();
    }

    console.log(file.query);
    console.log('============================================================\n\n');

    if (direction === 'up') {
      query = 'INSERT INTO schema_migrations VALUES (\'' + file.fullName + '\');'
    } else {
      query = 'DELETE FROM schema_migrations WHERE full_name=\'' + file.fullName + '\';'
    }

    client.query(query, function(err, result) {
      if (err) {
        console.log("TRANSACTION ABORTED, ROLLING BACK");
        console.log('============================================================\n\n');
        return cb();
      }

      if (migrationFiles[i + 1]) {
        runMigration(client, migrationFiles, i + 1, direction, cb);
      } else {
        cb();
      }
    });
  });
}
