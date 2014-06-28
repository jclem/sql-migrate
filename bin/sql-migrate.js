#!/usr/bin/env node

'use strict';

var fs      = require('fs');
var path    = require('path');
var program = require('commander');
var url     = require('url');
var lib     = require ('../lib/index.js');
var version = getVersion();

program
  .version(version)
  .option('-d, --database [name]', 'the database to use. defaults to process.env.DATABASE_URL')
  .option('-m, --migration-dir [dir]', 'the relative location of the migrations directory. defaults to ./migrations');

program
  .command('create <name>')
  .description('create a new migration')
  .action(function(name) {
    return lib.create(name, getMigrationDir(program));
  });

program
  .command('up [steps]')
  .description('migrate up')
  .action(function(steps) {
    var databaseName;

    try {
      databaseName = getDatabase(program);
    } catch(err) {
      return console.error('\n  error: database not provided or not detected\n');
    }

    steps = steps === undefined ? steps : +steps;
    return lib.change(steps, 'up', databaseName);
  });

program
  .command('down [steps]')
  .description('migrate down')
  .action(function(steps) {
    var databaseName;

    try {
      databaseName = getDatabase(program);
    } catch(err) {
      return console.error('\n  error: database not provided or not detected\n');
    }

    steps = steps === undefined ? 1 : +steps;
    return lib.change(steps, 'down', databaseName);
  });

program.parse(process.argv);

function getDatabase(program) {
  return program.database ||
    url.parse(process.env.DATABASE_URL).pathname.slice(1);
}

function getMigrationDir(program) {
  return program.migrationDir || './migrations';
}

function getVersion() {
  var packagePath = path.join(__dirname, '../package.json');
  var contents    = fs.readFileSync(packagePath);
  return JSON.parse(contents).version;
}
