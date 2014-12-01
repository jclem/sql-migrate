'use strict';

var async = require('async');
var fs    = require('fs');
var path  = require('path');

exports.run = function run(client, count, direction, migrationDir, cb) {
  async.waterfall([
    ensureMigrationsTable,
    fetchFilesAndRows,
    prepareMigrations,
    runMigrations
  ], function onDone() {
    cb();
  });

  function ensureMigrationsTable(cb) {
    client.query('CREATE TABLE IF NOT EXISTS schema_migrations(' +
                 'full_name varchar NOT NULL);', cb);
  }

  function fetchFilesAndRows(_, cb) {
    async.parallel({
      files: fetchMigrationFiles,
      rows : fetchMigrationRows
    }, cb);
  }

  function fetchMigrationFiles(cb) {
    fs.readdir(migrationDir, function onRead(err, files) {
      if (err) return cb(err);

      files = files.filter(function filterFiles(file) {
        return +file[0] > 0;
      }).sort(function sortFiles(fileA, fileB) {
        var fileAStamp = +fileA.split('-')[0];
        var fileBStamp = +fileB.split('-')[0];
        if (fileAStamp > fileBStamp) return 1;
        if (fileAStamp < fileBStamp) return -1;
        return 0;
      });

      async.map(files, function mapFiles(file, cb) {
        fs.readFile(path.join(migrationDir, file), cb);
      }, function onMapped(err, fileContents) {
        if (err) return cb(err);

        cb(null, fileContents.map(function mapFiles(contents, i) {
          var file     = files[i];
          var queries  = contents.toString().split(/^-- MIGRATE-(?:UP|DOWN)! --$/m);
          var query    = direction === 'up' ? queries[1] : queries[2];
          return { fullName: file.substr(0, file.length - 3), query: query.trim() };
        }));
      });
    });
  }

  function fetchMigrationRows(cb) {
    client.query('SELECT * FROM schema_migrations ORDER BY full_name ASC', function(err, result) {
      if (err) {
        cb(err);
      } else {
        cb(null, result.rows);
      }
    });
  }

  function prepareMigrations(results, cb) {
    var migrationFiles = results.files;
    var migrationRows  = results.rows;
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

    if (!migrationFiles.length) {
      console.log('No migrations');
    }

    cb(null, migrationFiles);
  }

  function runMigrations(migrationFiles, cb) {
    async.eachSeries(migrationFiles, runMigration, cb);
  }

  function runMigration(file, cb) {
    var query;

    console.log('============================================================');
    console.log('MIGRATION: ' + file.fullName);
    console.log('------------------------------------------------------------');

    async.series([
      function runMigrationQuery(cb) {
        client.query(file.query, cb);
      },

      function runSchemaQuery(cb) {
        if (direction === 'up') {
          query = 'INSERT INTO schema_migrations VALUES (\'' + file.fullName + '\');';
        } else {
          query = 'DELETE FROM schema_migrations WHERE full_name=\'' + file.fullName + '\';';
        }

        client.query(query, cb);
      },
    ], function onDone(err) {
      if (err) {
        console.log('\n' + err + '\n');
        console.log("TRANSACTION ABORTED, ROLLING BACK");
        console.log('============================================================\n\n');
        return cb(err);
      }

      console.log(file.query);
      console.log('============================================================\n\n');

      cb();
    });
  }
};
