#!/usr/bin/env node
var through = require('through2')
var bionodeSAM = require('./')

var args = process.argv.slice(2)

var command = args[0] //args.length > 2 ? args.slice(0, args.length-2) : null
var srdDest

console.log(command)
// if (args.length === 0) { throw Error('Please specify command and files') }
// else if (args.length === 1) { throw Error('Please provide a SRA file') }
// else if (args.length === 2) { srcDest = args[1] + ' .' }
// else if (args.length === 3) { srcDest = args.slice(args.length-2)  }
// else if (args.length > 3) { throw Error('Too many arguments specified') }

var sam = bionodeSAM(command)

var samStream = sam(args)

samStream.on('data', function(data) {
  process.stdout.write(data[0]+' -> '+data[1]+'\n')
})

samStream.on('error', function(error) {
  console.error(error)
})
