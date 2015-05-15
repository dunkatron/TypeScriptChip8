module Chip8 {
    function assert(condition: boolean, message: string) {
        if (!condition) {
            throw new AssertionException(message || "Assertion failed");
        }
    }

    class Exception {
        constructor(private message: string) {
        }

        public toString() {
            return this.message;
        }

        public getMessage() {
            return this.message;
        }
    }

    class AssertionException extends Exception {
    }

    class MemoryAccessException extends Exception {
    }

    // returns a number in the range [0, max)
    function randomInt(max: number) {
        return Math.floor(Math.random() * max);
    }

    // Many instructions take an X or Y argument that's always in the same
    // place. These helper functions extract them. 
    function getX(instr: number) {
        return (instr & 0x0F00) >> 16;
    }

    function getY(instr: number) {
        return (instr & 0x00F0) >> 8;
    }

    // The NNN argument to an instruction resides in the last 3 nibbles. This
    // helper method returns it.
    function getNNN(instr: number) {
        return instr & 0x0FFF;
    }

    // The KK argument to an instruction resides in the last 3 nibbles. This
    // helper method returns it.
    function getKK(instr: number) {
        return instr & 0x00FF;
    }

    // Character sprites supplied with the interpreter
    var CharacterSprites = [
        new Uint8Array([0xF0, 0x90, 0x90, 0x90, 0xF0]), // 0
        new Uint8Array([0x20, 0x60, 0x20, 0x20, 0x70]), // 1
        new Uint8Array([0xF0, 0x10, 0xF0, 0x80, 0xF0]), // 2
        new Uint8Array([0xF0, 0x10, 0xF0, 0x10, 0xF0]), // 3
        new Uint8Array([0x90, 0x90, 0xF0, 0x10, 0x10]), // 4
        new Uint8Array([0xF0, 0x80, 0xF0, 0x10, 0xF0]), // 5
        new Uint8Array([0xF0, 0x80, 0xF0, 0x90, 0xF0]), // 6
        new Uint8Array([0xF0, 0x10, 0x20, 0x40, 0x40]), // 7
        new Uint8Array([0xF0, 0x90, 0xF0, 0x90, 0xF0]), // 8
        new Uint8Array([0xF0, 0x90, 0xF0, 0x10, 0xF0]), // 9
        new Uint8Array([0xF0, 0x90, 0xF0, 0x90, 0x90]), // A
        new Uint8Array([0xE0, 0x90, 0xE0, 0x90, 0xE0]), // B
        new Uint8Array([0xF0, 0x80, 0x80, 0x80, 0xF0]), // C
        new Uint8Array([0xE0, 0x90, 0x90, 0x90, 0xE0]), // D
        new Uint8Array([0xF0, 0x80, 0xF0, 0x80, 0xF0]), // E
        new Uint8Array([0xF0, 0x80, 0xF0, 0x80, 0x80]), // F
    ];

    export class Machine {
        static LOW_MEM = 0x0200;
        static HIGH_MEM = 0x1000

        private V: Uint8Array; // Registers 0..15
        private VF: number; // Arithmetic flag register
        private I: number; // Address register
        private mem: Uint8Array; // Main memory

        private stack: number[]; // Program stack
        private stackPointer: number; // Index of the current top of stack
        private PC: number; // Program counter

        private delayTimerEnd: Date;
        private soundTimerEnd: Date;

        private terminate: boolean; // If true after a cycle, the program will terminate

        // Array of opcodes to try in order. For each one, we pass the instruction into the function and if it
        // can handle it, it does, then returns true. Otherwise it returns false and we move onto the next opcode
        // function.
        private opcodes: { (instr: number): boolean }[];

        // Addresses of the character sprites supplied with the interpreter from 0x0-0xF
        private characterSpriteAddresses: number[];

        constructor(private programData?: Uint8Array) {
            this.opcodes = [
                this.x00EE,
                this.x00E0,
                this.x1NNN,
                this.x2NNN,
                this.x3XKK,
                this.x4XKK,
                this.x5XY0,
                this.x6XKK,
                this.x7XKK,
                this.x8XY0,
                this.x8XY1,
                this.x8XY2,
                this.x8XY3,
                this.x8XY4,
                this.x8XY5,
                this.x8XY6,
                this.x8XY7,
                this.x8XYE,
                this.x9XY0,
                this.xANNN,
                this.xBNNN,
                this.xDXYN,
                this.xEXA1,
                this.xEX9E,
                this.xFX07,
                this.xFX0A,
                this.xFX15,
                this.xFX18,
                this.xFX1E,
                this.xFX29,
                this.xFX33,
                this.xFX55,
                this.xFX65,
            ];
        }

        // Get the current value of the PC
        public getPC() {
            return this.PC;
        }

        // Return a copy of this machine's memory
        public getMemoryCopy() {
            return new Uint8Array(this.mem);
        }

        // Return a copy of this machine's V registers
        public getVRegisters() {
            return new Uint8Array(this.V);
        }

        private pushStack(value: number) {
            this.stack.push(value);
        }

        // This actually returns the address that we initially entered the subroutine from
        private popStack(): number {
            if (this.stack.length > 0) {
                return this.stack.pop();
            } else {
                throw new MemoryAccessException("Tried to return from subroutine but stack is empty!");
            }
        }

        // Returns true if the given key (0-F) is currently down
        private getKeyPressed(key: number) {
            // TODO: Implement this method
            return false;
        }

        // Blocks until a key is pressed, then returns that key's value
        private getKey() {
            // TODO: Implement this method
            return 0;
        }

        private startSound() {
            // TODO: Implement this method
        }

        private stopSound() {
            // TODO: Implement this method
        }

        public run() {
            // Initialize VM state
            this.terminate = false;

            this.V = new Uint8Array(16);
            this.mem = new Uint8Array(4096);

            this.characterSpriteAddresses = [];

            // Load the character sprites into memory
            var currentOffset = 0;
            for (var i = 0; i < CharacterSprites.length; i++) {
                this.characterSpriteAddresses.push(currentOffset);
                var characterSprite = CharacterSprites[i];
                this.mem.set(characterSprite, currentOffset);
                currentOffset += characterSprite.length;
            }

            this.mem.set(this.programData, Machine.LOW_MEM);

            this.stack = [];
            this.delayTimerEnd = null;
            this.soundTimerEnd = null;

            // Begin execution
            this.PC = 0x200;

            // We bust out of this loop in the conditionals at the end of it
            while (true) {
                // Grab the instruction at the PC & try to execute it
                var instr: number = (this.mem[this.PC] << 16) + this.mem[this.PC + 1];

                // Increment program counter before we execute the opcode. We
                // do this because jump opcodes rely on having the PC not be
                // manipulated between their execution and the execution of thes
                // instruction at the new PC they've set.
                this.PC += 2;

                var handled = false;
                for (var i = 0; i < this.opcodes.length && !handled; i++) {
                    var opcode = this.opcodes[i];
                    handled = opcode(instr);
                }

                assert(handled, "Failed to handle instruction: " + instr.toString(16) + " at memory address " + this.PC.toString(16));

                if (this.PC < Machine.LOW_MEM) {
                    throw new MemoryAccessException("Tried to execute memory outside program memory.");
                } else if (this.terminate || this.PC >= Machine.HIGH_MEM) {
                    break;
                }

                var now = new Date();
                if (this.soundTimerEnd && now > this.soundTimerEnd) {
                    this.soundTimerEnd = null;
                    this.stopSound();
                }

                if (this.delayTimerEnd && now > this.delayTimerEnd) {
                    this.delayTimerEnd = null;
                }
            }
        }

        // Opcode functions

        // Calls subroutine at memory address NNN
        private x2NNN(instr: number) {
            if ((instr & 0xF000) == 0x2000) {
                // Since the main loop increments PC we're actually storing the
                // return address for this subroutine call.
                this.pushStack(this.PC);
                this.PC = getNNN(instr);

                return true;
            } else {
                return false;
            }
        }

        // Return from current subroutine
        private x00EE(instr: number) {
            if (instr == 0x00EE) {
                // Return from the top level routine (terminate)
                if (this.stackPointer == 0) {
                    this.terminate = true;
                } else {
                    // The top of the stack contains the return address for the
                    // last call (the instruction AFTER the 2NNN instruction)
                    this.PC = this.popStack();
                }

                return true;
            } else {
                return false;
            }
        }

        // Clears the screen.
        private x00E0(instr: number) {
            if (instr == 0x00E0) {
                // TODO: Implement this opcode

                assert(false, "Opcode not yet implemented");
                return true;
            } else {
                return false;
            }
        }

        // Jumps to address NNN.
        private x1NNN(instr: number) {
            if ((instr & 0xF000) == 0x1000) {
                this.PC = getNNN(instr);
                return true;
            } else {
                return false;
            }
        }

        // Skips the next instruction if VX equals KK.
        private x3XKK(instr: number) {
            if ((instr & 0xF000) == 0x3000) {
                if (this.V[getX(instr)] == getKK(instr)) {
                    this.PC += 2;
                }

                return true;
            } else {
                return false;
            }
        }

        // Skips the next instruction if VX doesn't equal KK.
        private x4XKK(instr: number) {
            if ((instr & 0xF000) == 0x4000) {
                if (this.V[getX(instr)] != getKK(instr)) {
                    this.PC += 2;
                }

                return true;
            } else {
                return false;
            }
        }

        // Skips the next instruction if VX equals VY.
        private x5XY0(instr: number) {
            if ((instr & 0xF00F) == 0x5000) {
                // TODO: Implement this opcode
                if (this.V[getX(instr)] == this.V[getY(instr)]) {
                    this.PC += 2;
                }

                return true;
            } else {
                return false;
            }
        }

        // Store value NN in register VX
        private x6XKK(instr: number) {
            if ((instr & 0xF000) == 0x6000) {
                this.V[getX(instr)] = getKK(instr);

                return true;
            } else {
                return false;
            }
        }

        // Add the value NN to register VX
        private x7XKK(instr: number) {
            if ((instr & 0xF000) == 0x7000) {
                var register = getX(instr);
                var result = (this.V[getX(instr)] + getKK(instr)) & 0xFFFF;
                this.V[register] = result;

                return true;
            } else {
                return false;
            }
        }

        // Store value of register VY in register VX
        private x8XY0(instr: number) {
            if ((instr & 0xF00F) == 0x8000) {
                var x = getX(instr);
                var y = getY(instr);
                this.V[x] = this.V[y];

                return true;
            } else {
                return false;
            }
        }

        // Set VX to VX OR VY
        private x8XY1(instr: number) {
            if ((instr & 0xF00F) == 0x8001) {
                var x = getX(instr);
                var y = getY(instr);

                this.V[x] = this.V[y] | this.V[x];

                return true;
            } else {
                return false;
            }
        }

        // Set VX to VX AND VY
        private x8XY2(instr: number) {
            if ((instr && 0xF00F) == 0x8002) {
                var x = getX(instr);
                var y = getY(instr);

                this.V[x] = this.V[y] & this.V[x];

                return true;
            } else {
                return false;
            }
        }

        // Set VX to VX XOR VY
        private x8XY3(instr: number) {
            if ((instr & 0xF00F) == 0x8003) {
                var x = getX(instr);
                var y = getY(instr);

                this.V[x] = this.V[y] ^ this.V[x];

                return true;
            } else {
                return false;
            }
        }

        // Add the value of register VY to register VX
        // Set VF to 01 if a carry occurs
        // Set VF to 00 if a carry does not occur
        private x8XY4(instr: number) {
            if ((instr & 0xF00F) == 0x8004) {
                var x = getX(instr);
                var y = getY(instr);

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
        // Set VF to 0 if a borrow occurs
        // Set VF to 1 if a borrow does not occur
        private x8XY5(instr: number) {
            if ((instr & 0xF00F) == 0x8005) {
                var x = getX(instr);
                var y = getY(instr);

                var result = this.V[x] - this.V[y];
                if (result < 0) {
                    result = 256 - result;
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
        private x8XY7(instr: number) {
            if ((instr & 0xF00F) == 0x8007) {
                var x = getX(instr);
                var y = getY(instr);

                var result = this.V[y] - this.V[x];
                if (result < 0) {
                    result = 256 - result;
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

        // Store the value of register VY shifted right one bit in register VX
        // Set register VF to the least significant bit prior to the shift
        private x8XY6(instr: number) {
            if ((instr & 0xF00F) == 0x8006) {
                var x = getX(instr);
                var y = getY(instr);

                this.VF = this.V[y] & 0x0001;
                this.V[x] = this.V[y] >> 1;

                return true;
            } else {
                return false;
            }
        }

        // Store the value of register VY shifted left one bit in register VX
        // Set register VF to the most significant bit prior to the shift
        private x8XYE(instr: number) {
            if ((instr & 0xF00F) == 0x800E) {
                var x = getX(instr);
                var y = getY(instr);

                this.VF = this.V[y] & 0x8000 >> 24;
                this.V[x] = (this.V[y] << 1) & 0xFFFF;

                return true;
            } else {
                return false;
            }
        }

        // Skips the next instruction if VX doesn't equal VY
        private x9XY0(instr: number) {
            if ((instr & 0xF00F) == 0x9000) {
                if (this.V[getX(instr)] != this.V[getY(instr)]) {
                    this.PC += 2;
                }

                return true;
            } else {
                return false;
            }
        }

        // Set I = NNN
        private xANNN(instr: number) {
            if ((instr & 0xF000) == 0xA000) {
                this.I = getNNN(instr);

                return true;
            } else {
                return false;
            }
        }

        // Jump to location nnn + V0.
        private xBNNN(instr: number) {
            if ((instr & 0xF000) == 0xB000) {
                this.PC = getNNN(instr) + this.V[0];

                return true;
            } else {
                return false;
            }
        }

        // Set Vx = random byte AND kk.
        private xCXKK(instr: number) {
            if ((instr & 0xF000) == 0xC000) {
                this.V[getX(instr)] = randomInt(256) & getKK(instr);

                return true;
            } else {
                return false;
            }
        }

        // Sprites stored in memory at location in index register (I), maximum 
        // 8bits wide. Wraps around the screen. If when drawn, clears a pixel,
        // register VF is set to 1 otherwise it is zero. All drawing is XOR 
        // drawing (i.e. it toggles the screen pixels)
        private xDXYN(instr: number) {
            if ((instr & 0xF000) & 0xD000) {
                // TODO: Implement this opcode

                assert(false, "Opcode not yet implemented");
                return true;
            } else {
                return false;
            }
        }

        // Skips the next instruction if the key stored in VX isn't pressed.
        private xEXA1(instr: number) {
            if ((instr & 0xF0FF) == 0xE0A1) {
                if (!this.getKeyPressed(getX(instr))) {
                    this.PC += 2;
                }
                return true;
            } else {
                return false;
            }
        }

        // Skips the next instruction if the key stored in VX is pressed.
        private xEX9E(instr: number) {
            if ((instr & 0xF0FF) == 0xE09E) {
                var x = getX(instr);
                if (this.getKeyPressed(getX(instr))) {
                    this.PC += 2;
                }
                return true;
            } else {
                return false;
            }
        }

        // Sets VX to the value of the delay timer.
        private xFX07(instr: number) {
            if ((instr & 0xF0FF) == 0xF007) {
                if (this.delayTimerEnd) {
                    var diff = new Date(this.delayTimerEnd.getTime() - new Date().getTime());
                    var time = diff.getTime();
                    if (time < 0) {
                        time = 0;
                    }

                    time = Math.floor(time / 1000 * 60);
                    this.V[getX(instr)] = time;
                } else {
                    this.V[getX(instr)] = 0;
                }
                return true;
            } else {
                return false;
            }
        }

        // A key press is awaited, and then stored in VX.
        private xFX0A(instr: number) {
            if ((instr & 0xF0FF) == 0xF00A) {
                this.V[getX(instr)] = this.getKey();
                return true;
            } else {
                return false;
            }
        }

        static dateSecondsInFuture(seconds: number) {
            return new Date(new Date().getTime() + seconds * 1000);
        }

        // Sets the delay timer to VX.
        private xFX15(instr: number) {
            if ((instr & 0xF0FF) == 0xF015) {
                var Vx = this.V[getX(instr)];
                var seconds = Vx / 60;
                this.delayTimerEnd = Machine.dateSecondsInFuture(seconds);
                return true;
            } else {
                return false;
            }
        }

        // Sets the sound timer to VX.
        private xFX18(instr: number) {
            if ((instr & 0xF0FF) == 0xF018) {
                var Vx = this.V[getX(instr)];
                if (Vx == 0) {
                    this.soundTimerEnd = null;
                    this.stopSound();
                } else {
                    this.startSound();
                    var seconds = Vx / 60;
                    this.soundTimerEnd = Machine.dateSecondsInFuture(seconds);
                }
                return true;
            } else {
                return false;
            }
        }

        // Adds VX to I. VF is set to 1 when range overflow (I+VX>0xFFF), and 
        // 0 when there isn't. This is undocumented feature of the CHIP-8 and
        // used by Spacefight 2091! game.
        private xFX1E(instr: number) {
            if ((instr & 0xF0FF) == 0xF01E) {
                // TODO: Implement this opcode

                assert(false, "Opcode not yet implemented");
                return true;
            } else {
                return false;
            }
        }

        // Sets I to the location of the sprite for the character in VX. Characters 0-F (in hexadecimal) are represented by a 4x5 font.
        private xFX29(instr: number) {
            if ((instr & 0xF0FF) == 0xF029) {
                var Vx = this.V[getX(instr)];
                this.I = this.characterSpriteAddresses[Vx];
                return true;
            } else {
                return false;
            }
        }

        // Stores the Binary-coded decimal representation of VX, with the most 
        // significant of three digits at the address in I, the middle digit at
        // I plus 1, and the least significant digit at I plus 2. (In other 
        // words, take the decimal representation of VX, place the hundreds 
        // digit in memory at location in I, the tens digit at location I+1, 
        // and the ones digit at location I+2.)
        private xFX33(instr: number) {
            if ((instr & 0xF0FF) == 0xF033) {
                // TODO: Implement this opcode

                assert(false, "Opcode not yet implemented");
                return true;
            } else {
                return false;
            }
        }

        // Stores V0 to VX in memory starting at address I.
        private xFX55(instr: number) {
            if ((instr & 0xF0FF) == 0xF055) {
                var x = getX(instr);

                for (var i = 0; i <= x; i++) {
                    var addr = this.I + i;
                    if (addr < Machine.LOW_MEM || addr >= Machine.HIGH_MEM) {
                        throw new MemoryAccessException("Tried to access memory outside writable range: " + addr);
                    }

                    this.mem[addr] = this.V[i];
                }

                return true;
            } else {
                return false;
            }
        }

        // Fills V0 to VX with values from memory starting at address I.
        private xFX65(instr: number) {
            if ((instr & 0xF0FF) == 0xF065) {
                var x = getX(instr);

                for (var i = 0; i <= x; i++) {
                    var addr = this.I + i;
                    if (addr < Machine.LOW_MEM || addr >= Machine.HIGH_MEM) {
                        throw new MemoryAccessException("Tried to access memory outside writable range: " + addr);
                    }

                    this.V[i] = this.mem[addr];
                }
                return true;
            } else {
                return false;
            }
        }
    }
}
