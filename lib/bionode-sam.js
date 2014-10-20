var path = require('path')
var spawn = require('child_process').spawn
var through = require('through2')
fs = require('fs')

module.exports = exports = SAM

function SAM(command) {
  var command = command || 'mem'

  return samStream

  function samStream(srcDest, callback) {
    var stream = through.obj(transform)
    if (srcDest) { stream.write(srcDest); stream.end() }
    if (callback) {
      stream.on('data', function(data) {
        callback(null, data)
      })
      stream.on('error', callback)
    }
    return stream

    function transform(obj, enc, next) {
      var self = this
      var multi = false

      if (typeof obj === 'string') { obj = obj.split(' ') }

      var samPath = path.join(__dirname, '../sam/samtools/samtools')
      var bcfPath = path.join(__dirname, '../sam/bcftools/bcftools')
      var vcfPath = path.join(__dirname, '../sam/bcftools/vcfutils.pl')
      var Arg1Ext = obj[0] ? obj[0].replace(/.*\./, '') : null
      var Arg2Ext = obj[1] ? obj[1].replace(/.*\./, '') : null
      var Arg3Ext = obj[2] ? obj[2].replace(/.*\./, '') : null

      if (Arg1Ext === 'sam') {
        // sam to bam conversion
        // samtools view -bS -o aln.bam aln.sam
        obj[1] = obj[1] || obj[0].replace('.sam', '.bam')
        multi = true
        var samToBam = spawn(samPath, [ 'view', '-bS', '-o', obj[1].replace('.bam', '.unsorted.bam'), obj[0] ])
        samToBam.stderr.on('data', function(data) { console.log(data.toString()) })
        var sortBam
        var indexBam
        samToBam.on('close', function(code) {
          if (code) { self.emit('error', new Error('Unknown error, check that "'+obj[0]+'" exists')) }
          else {
            sortBam = spawn(samPath, [ 'sort', obj[1].replace('.bam', '.unsorted.bam'), obj[1].replace('.bam', '') ])
            sortBam.on('close', function(code) {
              if (code) { self.emit('error', new Error('Unknown error, check that "'+obj[0]+'" exists')) }
              else {
                indexBam = spawn(samPath, [ 'index', obj[1] ])
                indexBam.on('close', function(code) {
                  if (code) { self.emit('error', new Error('Unknown error, check that "'+obj[0]+'" exists')) }
                  else {
                    var output = {
                      sam: obj[0],
                      bam: obj[1],
                      operation: "sam -> bam"
                    }
                    self.push(output)
                    next()
                  }
                })
              }
            })
          }
        })
      }

      else if (obj[0].indexOf('.fa') !== -1 && Arg2Ext === 'sam' && Arg3Ext === 'bam') {
        // Broken, FIX
        // sam to bam conversion with reference
        // samtools faidx ref.fa
        // samtools view -bt ref.fa.fai -o aln.bam aln.sam
        // console.log('sam -> bam')
        // multi = true
        // var samToBam = spawn(samPath, [ 'view', '-bt', obj[0], '-o', obj[2], obj[1] ])
        // samToBam.stderr.on('data', function(data) { console.log(data.toString()) })
        // var sortBam
        // var indexBam
        // sam.on('close', function(code) {
        //   if (code) { self.emit('error', new Error('Unknown error, check that "'+obj[0]+'" exists')) }
        //   else {
        //     sortBam = spawn(samPath, [ 'view', '-bt', obj[0], '-o', obj[2], obj[1] ])
        //   }
        // })
      }

      else if (Arg1Ext === 'bam' && Arg2Ext === 'sam') {
        // bam to sam conversion
        // samtools view -h -o out.sam in.bam
        console.log('bam -> sam')
        var sam = spawn(samPath, [ 'view', '-h', '-o', obj[1], obj[0] ])

      }
      // else if (Arg1Ext === 'bcf' && Arg2Ext === 'fq') {
      //   // bcf to fq conversion
      //   // samtools view -h -o out.sam in.bam
      //   console.log('bam -> sam')
      //   var sam = spawn(samPath, [ 'view', '-h', '-o', obj[1], obj[0] ])
      //
      // }

      else if (obj[0].indexOf('.fna') !== -1 && Arg2Ext === 'bam' && Arg3Ext === 'bcf') {
        // bam to bcf conversion with reference
        // samtools mpileup -C50 -uf ref.fa aln.bam > aln.bcf
        console.log('bam -> bcf')
        var sam = spawn(samPath, [ 'mpileup', '-C50', '-uf', obj[0], obj[1] ])
        var samOut = fs.createWriteStream(obj[2])
        sam.stdout.on('data', function(data) { samOut.write(data) })
      }
    else if (Arg1Ext === 'bcf' &&  obj[1].indexOf('.consensus.fq') !== -1) {
        console.log('bcf -> Confq')
        multi = true
        var bcf = spawn(bcfPath, [ 'view', '-c', obj[0] ])
        var vcf2fq = spawn(vcfPath, [ 'vcf2fq', '-d', '5', '-D', '100' ])
        var fqOut = fs.createWriteStream(obj[1])
        bcf.stdout.pipe(vcf2fq.stdin)
        bcf.stderr.pipe(process.stdout)
        vcf2fq.stderr.pipe(process.stdout)
        vcf2fq.stdout.pipe(fqOut)
        // sam.stdout.on('data', function(data) { samOut.write(data) })
        vcf2fq.on('close', next)
      }

      // var options
      //
      // options = [cmd, ref]
      // if (reads) { options.push(reads) }
      // console.log(options)
      // var sam = spawn(bwaPath, options)
      // if (sam) {
      //   var samOut = fs.createWriteStream(sam)
      //   sam.stdout.on('data', function(data) {
      //     // if (typeof)
      //     // console.log(data)
      //     samOut.write(data)
      //   })
      // }
      //
      if (multi === false) {

        sam.stderr.on('data', function(data) {
          console.log(data.toString())
          // self.emit('error', new Error(data.toString()))
          // next()
        })

        sam.on('close', function(code) {
          if (code) {
            self.emit('error', new Error('Unknown error, check that "'+obj[0]+'" exists'))
          }
          else {
            // self.push([obj[0], destination])
            self.push(code)
            next()
          }
        })
      }
    }
  }
}
