#!/usr/bin/env node

'use strict';

var lib = require ('../lib/index.js');

function main() {
  var command = process.argv[2];

  try {
    exec(command);
  } catch(e) {
    console.error(e.message);
  }
}

function exec(command) {
  var name, count;

  if (command == 'create') {

    name = process.argv[3];
    return lib.create(name);

  } else if (command == 'up') {

    count = process.argv[3];
    return lib.change(count, command)

  } else if (command == 'down') {

    count = process.argv[3] || 1;
    return lib.change(count, command)

  } else {

    throw new Error('Command not recognized');

  }
}

main();
