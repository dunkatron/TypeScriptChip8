var parser = require('./parser/parser');
var Chip8Assembler = require('./bin/Chip8Assembler');
var fs = require('fs');
var fileContent = fs.readFileSync('./parser/test.asm', 'utf8');
var res = Chip8Assembler.assemble(fileContent, parser.parse);
console.log(res);