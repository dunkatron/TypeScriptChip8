var Chip8;
(function (Chip8) {
    function assert(condition, message) {
        if (!condition) {
            throw message || "Assertion failed";
        }
    }
    Chip8.assert = assert;

    var Machine = (function () {
        function Machine(programData) {
            this.programData = programData;
            this.opcodes = [
                this.x2NNN,
                this.x00EE,
                this.x6XNN,
                this.x7XNN,
                this.x8XY0,
                this.x8XY1,
                this.x8XY2,
                this.x8XY3,
                this.x8XY4,
                this.x8XY5,
                this.x8XY6,
                this.x8XY7,
                this.x8XYE
            ];
        }
        Machine.prototype.pushStack = function (value) {
            this.stack[this.stackPointer] = value;
            this.stackPointer++;
        };

        // This actually returns the address that we initially entered the subroutine from
        Machine.prototype.popStack = function () {
            this.stackPointer--;
            return this.stack[this.stackPointer];
        };

        Machine.prototype.run = function () {
            // Initialize VM state
            this.terminate = false;

            this.V = new Uint8Array(16);
            this.mem = new Uint8Array(4096);

            for (var i = 0; i < this.programData.length; i++) {
                this.mem[Machine.LOW_MEM + i] = this.programData[i];
            }

            this.stack = new Uint16Array(16);
            this.delayTimer = 0;
            this.soundTimer = 0;
            this.keys = [];
            for (var i = 0; i < 16; i++) {
                this.keys.push(false);
            }

            // Begin execution
            this.PC = 0x200;
            while (this.PC >= Machine.LOW_MEM && this.PC < Machine.HIGH_MEM && !this.terminate) {
                // Grab the instruction at the PC & try to execute it
                var instr = this.mem[this.PC];

                var handled = false;
                var i = 0;
                while (!handled && i < this.opcodes.length) {
                    var opcode = this.opcodes[i];
                    handled = opcode(instr);
                }

                assert(handled, "Failed to handle instruction: " + instr.toString(16) + " at memory address " + this.PC.toString(16));
            }
        };

        // Opcode functions
        // Jump to subroutine at memory address NNN
        Machine.prototype.x2NNN = function (instr) {
            if (andCompare(0x2000, instr)) {
                this.pushStack(this.PC);
                this.PC = instr & 0x0FFF;

                return true;
            } else {
                return false;
            }
        };

        // Return from current subroutine
        Machine.prototype.x00EE = function (instr) {
            if (instr == 0x00EE) {
                // Return from the top level routine (terminate)
                if (this.stackPointer == 0) {
                    this.terminate = true;
                } else {
                    var retAddr = this.popStack();
                    this.PC = retAddr + 1;
                }

                return true;
            } else {
                return false;
            }
        };

        // Store value NN in register VX
        Machine.prototype.x6XNN = function (instr) {
            if (andCompare(0x6000, instr)) {
                var register = (0x0F00 & instr) >> 16;
                var value = 0x00FF & instr;

                this.V[register] = value;

                return true;
            } else {
                return false;
            }
        };

        // Add the value NN to register VX
        Machine.prototype.x7XNN = function (instr) {
            if (andCompare(0x7000, instr)) {
                var register = (0x0F00 & instr) >> 16;
                var value = 0x00FF & instr;

                this.V[register] += value;

                return true;
            } else {
                return false;
            }
        };

        // Store value of register VY in register VX
        Machine.prototype.x8XY0 = function (instr) {
            if ((instr & 0xF00F) == 0x8000) {
                var x = (instr & 0x0F00) >> 16;
                var y = (instr & 0x00F0) >> 8;
                this.V[x] = this.V[y];

                return true;
            } else {
                return false;
            }
        };

        // Set VX to VX OR VY
        Machine.prototype.x8XY1 = function (instr) {
            if ((instr & 0xF00F) == 0x8001) {
                var x = (instr & 0x0F00) >> 16;
                var y = (instr & 0x00F0) >> 8;

                this.V[x] = this.V[y] | this.V[x];

                return true;
            } else {
                return false;
            }
        };

        // Set VX to VX AND VY
        Machine.prototype.x8XY2 = function (instr) {
            if ((instr && 0xF00F) == 0x8002) {
                var x = (instr & 0x0F00) >> 16;
                var y = (instr & 0x00F0) >> 8;

                this.V[x] = this.V[y] & this.V[x];

                return true;
            } else {
                return false;
            }
        };

        // Set VX to VX XOR VY
        Machine.prototype.x8XY3 = function (instr) {
            if ((instr & 0xF00F) == 0x8003) {
                var x = (instr & 0x0F00) >> 16;
                var y = (instr & 0x00F0) >> 8;

                this.V[x] = this.V[y] ^ this.V[x];

                return true;
            } else {
                return false;
            }
        };

        // Add the value of register VY to register VX
        // Set VF to 01 if a carry occurs
        // Set VF to 00 if a carry does not occur
        Machine.prototype.x8XY4 = function (instr) {
            if ((instr & 0xF00F) == 0x8004) {
                var x = (instr & 0x0F00) >> 16;
                var y = (instr & 0x00F0) >> 8;

                var result = this.V[x] + this.V[y];
                if (result > 255) {
                    result %= 256;
                    this.VF = 1;
                } else {
                    this.VF = 0;
                }

                this.V[x] = result;

                return true;
            } else {
                return false;
            }
        };

        // Subtract the value of register VY from register VX
        // Set VF to 00 if a borrow occurs
        // Set VF to 01 if a borrow does not occur
        Machine.prototype.x8XY5 = function (instr) {
            if ((instr & 0xF00F) == 0x8005) {
                var x = (instr & 0x0F00) >> 16;
                var y = (instr & 0x00F0) >> 8;

                var result = this.V[x] - this.V[y];
                if (result < 0) {
                    result %= 256;
                    this.VF = 0;
                } else {
                    this.VF = 1;
                }

                this.V[x] = result;

                return true;
            } else {
                return false;
            }
        };

        // Set register VX to the value of VY minus VX
        // Set VF to 00 if a borrow occurs
        // Set VF to 01 if a borrow does not occur
        Machine.prototype.x8XY7 = function (instr) {
            if ((instr & 0xF00F) == 0x8007) {
                var x = (instr & 0x0F00) >> 16;
                var y = (instr & 0x00F0) >> 8;

                var result = this.V[y] - this.V[x];
                if (result < 0) {
                    result %= 256;
                    this.VF = 0;
                } else {
                    this.VF = 1;
                }

                this.V[x] = result;

                return true;
            } else {
                return false;
            }
        };

        // Store the value of register VY shifted right one bit in register VX
        // Set register VF to the least significant bit prior to the shift
        Machine.prototype.x8XY6 = function (instr) {
            if ((instr & 0xF00F) == 0x8006) {
                var x = (instr & 0x0F00) >> 16;
                var y = (instr & 0x00F0) >> 8;

                this.VF = this.V[y] & 0x0001;
                this.V[x] = this.V[y] >> 1;

                return true;
            } else {
                return false;
            }
        };

        // Store the value of register VY shifted left one bit in register VX
        // Set register VF to the most significant bit prior to the shift
        Machine.prototype.x8XYE = function (instr) {
            if ((instr & 0xF00F) == 0x800E) {
                var x = (instr & 0x0F00) >> 16;
                var y = (instr & 0x00F0) >> 8;

                this.VF = this.V[y] & 0x8000;
                this.V[x] = this.V[y] << 1;

                return true;
            } else {
                return false;
            }
        };
        Machine.LOW_MEM = 0x200;
        Machine.HIGH_MEM = 0x1000;
        return Machine;
    })();

    function andCompare(compareValue, value) {
        return (compareValue & value) == compareValue;
    }
})(Chip8 || (Chip8 = {}));
//# sourceMappingURL=Chip8.js.map
