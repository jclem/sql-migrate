exec = require('child_process').exec
fs   = require 'fs'
path = require 'path'
sm   = require '../lib'
dir  = path.join __dirname, './migrations'

require 'should'

describe 'sql-migrate', ->
  afterEach (done) ->
    exec "rm #{dir}/*", done

  describe '#create', ->
    beforeEach (done) ->
      sm.create 'name', dir, (err, fileName) =>
        @fileName = fileName
        done()

    it 'creates a new migration file', ->
      /^\d{14}-name\.sql$/.test(@fileName).should.eql true

    it 'uses the migration template', (done) ->
      fs.readFile path.join(dir, @fileName), (err, contents) ->
        contents = contents.toString()
        contents.should.eql '-- MIGRATE-UP! --\n\n-- MIGRATE-DOWN! --'
        done()
