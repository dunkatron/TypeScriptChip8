/// <reference path='../parser/parser.d.ts' />

module Chip8Assembler {
    export interface ParseFunction {
        (contents:string):parser.Line[];
    }

    export function assemble(contents:string, parse:ParseFunction) {
        var lines = parse(contents);
        return transformParsedProgram(lines);
    }

    class AssemblerException {
        constructor(public message:string) {

        }

        public toString() {
            return this.message;
        }
    }

    function transformParsedProgram(lines:parser.Line[]):Uint8Array {
        var startAddress = 0x0200;
        var symbolicLabels:{[name:string]: number} = {};
        // Find all the symbolic labels

        for (var i = 0; i < lines.length; i++) {
            var currentAddress = startAddress + i * 2;
            var line = lines[i];

            line.addr = currentAddress;

            for (var k in line.labels) {
                if (line.labels.hasOwnProperty(k)) {
                    var label = line.labels[k];
                    if (label.type === "symbolic") {
                        if (symbolicLabels[label.name]) {
                            throw new AssemblerException("The label " + label.name + " is not unique!");
                        }
                        symbolicLabels[label.name] = currentAddress;
                    }
                }
            }
        }

        // Perform all the replacements
        for (var i = 0; i < lines.length; i++) {
            var line = lines[i];
            var instruction = line.instruction;
            var value = instruction.template;

            if (instruction.replacements) {
                for (var k in instruction.replacements) {
                    if (instruction.replacements.hasOwnProperty(k)) {
                        var replacement = instruction.replacements[k];
                        var addr = 0;
                        switch (replacement.type) {
                            case "symbolic":
                                if (!symbolicLabels[replacement.name]) {
                                    throw new AssemblerException("Referenced label " + replacement.name + " doesn't exist!");
                                }
                                addr = symbolicLabels[replacement.name];
                                break;
                            case "numeric":
                                var direction = replacement.forward ? 1 : -1;
                                var found = false;
                                for (var j = i; j >= 0 && j < lines.length; j += direction) {
                                    var otherLine = lines[j];
                                    if (otherLine.labels[replacement.name]) {
                                        found = true;
                                        addr = otherLine.addr;
                                        break;
                                    }
                                }

                                if (!found) {
                                    throw new AssemblerException("Failed to find the label " + replacement.name + (replacement.forward ? " ahead of " : " behind ") + " this one.");
                                }
                                break;
                            case "raw":
                                addr = replacement.value;
                                break;
                        }
                        var hexAddr = "0000" + addr.toString(16);
                        value = value.replace(k, hexAddr.substr(hexAddr.length - k.length));
                    }
                }
            }

            line.value = value;
        }

        var bytes = lines.map(function (item) {
            return item.value;
        });

        var array = new Uint16Array(bytes.length);

        for (var i = 0; i < bytes.length; i++) {
            var byte = bytes[i];
            array[i] = parseInt(byte, 16);
        }

        return array;
    }
}

export = Chip8Assembler;