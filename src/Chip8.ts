module Chip8 {
    export function assert(condition : boolean, message : string) {
        if (!condition) {
            throw message || "Assertion failed";
        }
    }

    class Machine {
        static LOW_MEM = 0x200;
        static HIGH_MEM = 0x1000

        private V : Uint8Array; // Registers 0..15
        private VF : number; // Arithmetic carry array
        private mem : Uint8Array; // Main memory

        private stack : Uint16Array; // Program stack
        private stackPointer : number; // Index of the current top of stack
        private PC : number; // Program counter

        private delayTimer : number;
        private soundTimer : number;

        private terminate : boolean; // If true after a cycle, the program will terminate

        private keys : boolean[];

        // Array of opcodes to try in order. For each one, we pass the instruction into the function and if it
        // can handle it, it does, then returns true. Otherwise it returns false and we move onto the next opcode
        // function.
        private opcodes : {(instr : number) : boolean}[];

        constructor(private programData : Uint8Array) {
            this.opcodes = [
                this.x2NNN,
                this.x00EE,
                this.x6XNN,
                this.x7XNN,
                this.x8XY0,
                this.x8XY4,
                this.x8XY5,
                this.x8XY7
            ];
        }

        pushStack(value : number) {
            this.stack[this.stackPointer] = value;
            this.stackPointer++;
        }

        // This actually returns the address that we initially entered the subroutine from
        popStack() : number {
            this.stackPointer--;
            return this.stack[this.stackPointer];
        }

        run() {
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
                var instr : number = this.mem[this.PC];

                var handled = false;
                var i = 0;
                while (!handled && i < this.opcodes.length) {
                    var opcode = this.opcodes[i];
                    handled = opcode(instr);
                }

                assert(handled, "Failed to handle instruction: " + instr.toString(16) + " at memory address " + this.PC.toString(16));
            }
        }

        // Opcode functions

        // Jump to subroutine at memory address NNN
        x2NNN(instr) {
            if (andCompare(0x2000, instr)) {
                this.pushStack(this.PC);
                this.PC = instr & 0x0FFF;

                return true;
            } else {
                return false;
            }
        }

        // Return from current subroutine
        x00EE(instr) {
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
        }

        // Store value NN in register VX
        x6XNN(instr) {
            if (andCompare(0x6000, instr)) {
                var register = (0x0F00 & instr) >> 16;
                var value = 0x00FF & instr;

                this.V[register] = value;

                return true;
            } else {
                return false;
            }
        }

        // Add the value NN to register VX
        x7XNN(instr) {
            if (andCompare(0x7000, instr)) {
                var register = (0x0F00 & instr) >> 16;
                var value = 0x00FF & instr;

                this.V[register] += value;

                return true;
            } else {
                return false;
            }
        }

        // Store value of register VY in register VX
        x8XY0(instr) {
            if ((instr & 0xF00F) == 0x8000) {
                var x = (instr & 0x0F00) >> 16;
                var y = (instr & 0x00F0) >> 8;
                this.V[x] = this.V[y];

                return true;
            } else {
                return false;
            }
        }

        // Add the value of register VY to register VX
        // Set VF to 01 if a carry occurs
        // Set VF to 00 if a carry does not occur
        x8XY4(instr) {
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
        }

        // Subtract the value of register VY from register VX
        // Set VF to 00 if a borrow occurs
        // Set VF to 01 if a borrow does not occur
        x8XY5(instr) {
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
        }

        // Set register VX to the value of VY minus VX
        // Set VF to 00 if a borrow occurs
        // Set VF to 01 if a borrow does not occur
        x8XY7(instr) {
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
        }
    }

    function andCompare(compareValue : number, value : number) {
        return (compareValue & value) == compareValue;
    }
}