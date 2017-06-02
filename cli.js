#!/usr/bin/env node
var through = require('through2')
var minimist = require('minimist')
var bionodeSAM = require('./')

var args = minimist(process.argv.slice(2))

var command = args._[0]
var lastArg = args._[args._.length - 1]
var wantsStdin = false
if (lastArg === '-') {
  wantsStdin = true
  args._.pop()
}

// if (args.length === 0) { throw Error('Please specify command and files') }
// else if (args.length === 1) { throw Error('Please provide a SRA file') }
// else if (args.length === 2) { srcDest = args[1] + ' .' }
// else if (args.length === 3) { srcDest = args.slice(args.length-2)  }
// else if (args.length > 3) { throw Error('Too many arguments specified') }

var sam = bionodeSAM(command)

if (wantsStdin) {
  process.stdin.setEncoding('utf8')

  process.stdin.on('data', function (data) {
    data = data.trim()
    if (data === '') { return }
    args._.push(data.trim())
    var samStream = sam(args._)
    samStream.pipe(JSONstringify()).pipe(process.stdout)
    samStream.on('error', console.log)
  })
} else {
  var samStream = sam(args._)
  samStream.pipe(JSONstringify()).pipe(process.stdout)
  samStream.on('error', console.log)
}

function JSONstringify () {
  var stream = through.obj(transform)
  return stream
  function transform (obj, enc, next) {
    try { obj = JSON.stringify(obj) } catch (e) {}
    if (obj !== '') { this.push(obj + '\n') }
    next()
  }
}
