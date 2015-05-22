/// <reference path="../parser/parser.d.ts" />
declare module Chip8Assembler {
    interface ParseFunction {
        (contents: string): parser.Line[];
    }
    function assemble(contents: string, parse: ParseFunction): Uint8Array;
}
export = Chip8Assembler;
