#!/usr/bin/env node

'use strict';

var program = require('commander');
var lib     = require ('../lib');
var version = require('../package.json').version;

program
  .version(version)
  .option('-d, --database [name]', 'the database to use. if not provided, ' +
          'database defaults to process.env.DATABASE_URL')
  .option('-m, --migration-dir [dir]', 'the relative location of the ' +
          'migrations directory. defaults to ./migrations');

program
  .command('create <name>')
  .description('create a new migration')
  .action(function create(name) {
    return lib.create(name, getMigrationDir(program));
  });

program
  .command('up [steps]')
  .description('migrate up')
  .action(function up(steps) {
    var databaseURL = getDatabaseURL(program);

    if (!databaseURL) {
      console.error('Error: Database not provided or not detected.');
      process.exit(1);
    }

    steps = steps === undefined ? steps : +steps;
    return lib.change(+steps, 'up', databaseURL, getMigrationDir(program));
  });

program
  .command('down [steps]')
  .description('migrate down')
  .action(function down(steps) {
    var databaseURL = getDatabaseURL(program);

    if (!databaseURL) {
      console.error('Error: Database not provided or not detected.');
      process.exit(1);
    }

    steps = steps === undefined ? 1 : +steps;
    return lib.change(steps, 'down', databaseURL, getMigrationDir(program));
  });

program.parse(process.argv);

function getDatabaseURL(program) {
  if (program.database && /^postgres:\/\/.+/.test(program.database)) {
    return program.database;
  } else if (program.database) {
    return 'postgres://localhost:5432/' + program.database;
  } else {
    return process.env.DATABASE_URL;
  }
}

function getMigrationDir(program) {
  return program.migrationDir || './migrations';
}
