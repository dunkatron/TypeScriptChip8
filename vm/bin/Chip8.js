var __extends = this.__extends || function (d, b) {
    for (var p in b) if (b.hasOwnProperty(p)) d[p] = b[p];
    function __() { this.constructor = d; }
    __.prototype = b.prototype;
    d.prototype = new __();
};
var Chip8;
(function (Chip8) {
    function assert(condition, message) {
        if (!condition) {
            throw new AssertionException(message || "Assertion failed");
        }
    }
    var Exception = (function () {
        function Exception(message) {
            this.message = message;
        }
        Exception.prototype.toString = function () {
            return this.message;
        };
        return Exception;
    })();
    var AssertionException = (function (_super) {
        __extends(AssertionException, _super);
        function AssertionException() {
            _super.apply(this, arguments);
        }
        return AssertionException;
    })(Exception);
    var MemoryAccessException = (function (_super) {
        __extends(MemoryAccessException, _super);
        function MemoryAccessException() {
            _super.apply(this, arguments);
        }
        return MemoryAccessException;
    })(Exception);
    // returns a number in the range [0, max)
    function randomInt(max) {
        return Math.floor(Math.random() * max);
    }
    // Many instructions take an X or Y argument that's always in the same
    // place. These helper functions extract them. 
    function getX(instr) {
        return (instr & 0x0F00) >> 8;
    }
    function getY(instr) {
        return (instr & 0x00F0) >> 4;
    }
    // The NNN argument to an instruction resides in the last 3 nibbles. This
    // helper method returns it.
    function getNNN(instr) {
        return instr & 0x0FFF;
    }
    // The KK argument to an instruction resides in the last 3 nibbles. This
    // helper method returns it.
    function getKK(instr) {
        return instr & 0x00FF;
    }
    // The N argument to an instruction resides in the last nibble. This helper
    // method returns it.
    function getN(instr) {
        return instr & 0x000F;
    }
    // Character sprites supplied with the interpreter
    var CharacterSprites = [
        new Uint8Array([0xF0, 0x90, 0x90, 0x90, 0xF0]),
        new Uint8Array([0x20, 0x60, 0x20, 0x20, 0x70]),
        new Uint8Array([0xF0, 0x10, 0xF0, 0x80, 0xF0]),
        new Uint8Array([0xF0, 0x10, 0xF0, 0x10, 0xF0]),
        new Uint8Array([0x90, 0x90, 0xF0, 0x10, 0x10]),
        new Uint8Array([0xF0, 0x80, 0xF0, 0x10, 0xF0]),
        new Uint8Array([0xF0, 0x80, 0xF0, 0x90, 0xF0]),
        new Uint8Array([0xF0, 0x10, 0x20, 0x40, 0x40]),
        new Uint8Array([0xF0, 0x90, 0xF0, 0x90, 0xF0]),
        new Uint8Array([0xF0, 0x90, 0xF0, 0x10, 0xF0]),
        new Uint8Array([0xF0, 0x90, 0xF0, 0x90, 0x90]),
        new Uint8Array([0xE0, 0x90, 0xE0, 0x90, 0xE0]),
        new Uint8Array([0xF0, 0x80, 0x80, 0x80, 0xF0]),
        new Uint8Array([0xE0, 0x90, 0x90, 0x90, 0xE0]),
        new Uint8Array([0xF0, 0x80, 0xF0, 0x80, 0xF0]),
        new Uint8Array([0xF0, 0x80, 0xF0, 0x80, 0x80]),
    ];
    var Machine = (function () {
        function Machine(externalHardware, programData) {
            var _this = this;
            this.externalHardware = externalHardware;
            this.programData = programData;
            this.opcodes = {
                0x0: [
                    this.x00EE,
                    this.x00E0,
                ],
                0x1: [
                    this.x1NNN,
                ],
                0x2: [
                    this.x2NNN,
                ],
                0x3: [
                    this.x3XKK,
                ],
                0x4: [
                    this.x4XKK,
                ],
                0x5: [
                    this.x5XY0,
                ],
                0x6: [
                    this.x6XKK,
                ],
                0x7: [
                    this.x7XKK,
                ],
                0x8: [
                    this.x8XY0,
                    this.x8XY1,
                    this.x8XY2,
                    this.x8XY3,
                    this.x8XY4,
                    this.x8XY5,
                    this.x8XY6,
                    this.x8XY7,
                    this.x8XYE,
                ],
                0x9: [
                    this.x9XY0,
                ],
                0xA: [
                    this.xANNN,
                ],
                0xB: [
                    this.xBNNN,
                ],
                0xC: [
                    this.xCXKK,
                ],
                0xD: [
                    this.xDXYN,
                ],
                0xE: [
                    this.xEXA1,
                    this.xEX9E,
                ],
                0xF: [
                    this.xFX07,
                    this.xFX0A,
                    this.xFX15,
                    this.xFX18,
                    this.xFX1E,
                    this.xFX29,
                    this.xFX33,
                    this.xFX55,
                    this.xFX65,
                ]
            };
            for (var k in this.opcodes) {
                this.opcodes[k] = this.opcodes[k].map(function (item) { return item.bind(_this); });
            }
            this.screen = [];
            for (var row = 0; row < Machine.SCREEN_HEIGHT; row++) {
                var rowArray = [];
                for (var col = 0; col < Machine.SCREEN_WIDTH; col++) {
                    rowArray.push(false);
                }
                this.screen.push(rowArray);
            }
            // Initialize VM state
            this.terminate = false;
            this.V = new Uint8Array(16);
            this.mem = new Uint8Array(4096);
            this.I = 0;
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
            this.deliverFramebuffer();
        }
        // Get the current value of the PC
        Machine.prototype.getPC = function () {
            return this.PC;
        };
        // Return a copy of this machine's memory
        Machine.prototype.getMemoryCopy = function () {
            return new Uint8Array(this.mem);
        };
        // Return a copy of this machine's V registers
        Machine.prototype.getVRegisters = function () {
            return new Uint8Array(this.V);
        };
        Machine.prototype.pushStack = function (value) {
            this.stack.push(value);
        };
        // This actually returns the address that we initially entered the subroutine from
        Machine.prototype.popStack = function () {
            if (this.stack.length > 0) {
                return this.stack.pop();
            }
            else {
                throw new MemoryAccessException("Tried to return from subroutine but stack is empty!");
            }
        };
        // Returns true if the given key (0-F) is currently down
        Machine.prototype.getKeyPressed = function (key) {
            return this.externalHardware.isKeyDown(key);
        };
        // Blocks until a key is pressed, then returns that key's value
        Machine.prototype.getKey = function () {
            return this.externalHardware.waitForKeyPress();
        };
        Machine.prototype.deliverFramebuffer = function () {
            this.externalHardware.deliverFramebuffer(this.screen.map(function (rowToCopy) {
                return rowToCopy.map(function (item) { return item; });
            }));
        };
        Machine.prototype.startSound = function () {
            // TODO: Implement this method
        };
        Machine.prototype.stopSound = function () {
            // TODO: Implement this method
        };
        Machine.prototype.setMem = function (addr, value) {
            if (addr >= Machine.HIGH_MEM || addr < Machine.LOW_MEM) {
                throw new MemoryAccessException("Illegal memory access: " + addr);
            }
            this.mem[addr] = value;
        };
        Machine.prototype.getMem = function (addr) {
            if (addr >= Machine.HIGH_MEM || addr < Machine.LOW_MEM) {
                throw new MemoryAccessException("Illegal memory access: " + addr);
            }
            return this.mem[addr];
        };
        /**
         * Call this to execute the next "count" instructions in this VM. Do not call again after execution has
         * terminated (after this method returns false)!
         * @param count the number of instructions to execute
         * @returns {boolean} true if this method can be called again to continue execution.
         */
        Machine.prototype.executeInstructions = function (count) {
            assert(!this.terminate, "Tried to continue executing a terminated VM!");
            while (count > 0) {
                // Grab the instruction at the PC & try to execute it
                var instr = (this.getMem(this.PC) << 8) + this.getMem(this.PC + 1);
                // Increment program counter before we execute the opcode. We
                // do this because jump opcodes rely on having the PC not be
                // manipulated between their execution and the execution of the
                // instruction at the new PC they've set.
                this.PC += 2;
                var handled = false;
                var prefix = (instr >> 12) & 0xF;
                var opcodes = this.opcodes[prefix];
                for (var i = 0; i < opcodes.length && !handled; i++) {
                    var opcode = opcodes[i];
                    handled = opcode(instr);
                }
                assert(handled, "Failed to handle instruction: " + instr.toString(16) + " at memory address " + this.PC.toString(16));
                if (this.PC < Machine.LOW_MEM) {
                    throw new MemoryAccessException("Tried to execute memory outside program memory.");
                }
                else if (this.terminate || this.PC >= Machine.HIGH_MEM) {
                    // We always return false if there are
                    this.terminate = true;
                    return false;
                }
                if (this.soundTimerEnd || this.delayTimerEnd) {
                    var now = new Date();
                    if (this.soundTimerEnd && now > this.soundTimerEnd) {
                        this.soundTimerEnd = null;
                        this.stopSound();
                    }
                    if (this.delayTimerEnd && now > this.delayTimerEnd) {
                        this.delayTimerEnd = null;
                    }
                }
                count--;
            }
            return true;
        };
        // Opcode functions
        // Calls subroutine at memory address NNN
        Machine.prototype.x2NNN = function (instr) {
            if ((instr & 0xF000) == 0x2000) {
                // Since the main loop increments PC we're actually storing the
                // return address for this subroutine call.
                this.pushStack(this.PC);
                this.PC = getNNN(instr);
                return true;
            }
            else {
                return false;
            }
        };
        // Return from current subroutine
        Machine.prototype.x00EE = function (instr) {
            if (instr == 0x00EE) {
                // Return from the top level routine (terminate)
                if (this.stack.length == 0) {
                    this.terminate = true;
                }
                else {
                    // The top of the stack contains the return address for the
                    // last call (the instruction AFTER the 2NNN instruction)
                    this.PC = this.popStack();
                }
                return true;
            }
            else {
                return false;
            }
        };
        // Clears the screen.
        Machine.prototype.x00E0 = function (instr) {
            if (instr == 0x00E0) {
                for (var i = 0; i < this.screen.length; i++) {
                    var row = this.screen[i];
                    for (var j = 0; j < row.length; j++) {
                        row[j] = false;
                    }
                }
                this.deliverFramebuffer();
                return true;
            }
            else {
                return false;
            }
        };
        // Jumps to address NNN.
        Machine.prototype.x1NNN = function (instr) {
            if ((instr & 0xF000) == 0x1000) {
                this.PC = getNNN(instr);
                return true;
            }
            else {
                return false;
            }
        };
        // Skips the next instruction if VX equals KK.
        Machine.prototype.x3XKK = function (instr) {
            if ((instr & 0xF000) == 0x3000) {
                if (this.V[getX(instr)] == getKK(instr)) {
                    this.PC += 2;
                }
                return true;
            }
            else {
                return false;
            }
        };
        // Skips the next instruction if VX doesn't equal KK.
        Machine.prototype.x4XKK = function (instr) {
            if ((instr & 0xF000) == 0x4000) {
                if (this.V[getX(instr)] != getKK(instr)) {
                    this.PC += 2;
                }
                return true;
            }
            else {
                return false;
            }
        };
        // Skips the next instruction if VX equals VY.
        Machine.prototype.x5XY0 = function (instr) {
            if ((instr & 0xF00F) == 0x5000) {
                if (this.V[getX(instr)] == this.V[getY(instr)]) {
                    this.PC += 2;
                }
                return true;
            }
            else {
                return false;
            }
        };
        // Store value NN in register VX
        Machine.prototype.x6XKK = function (instr) {
            if ((instr & 0xF000) == 0x6000) {
                this.V[getX(instr)] = getKK(instr);
                return true;
            }
            else {
                return false;
            }
        };
        // Add the value NN to register VX
        Machine.prototype.x7XKK = function (instr) {
            if ((instr & 0xF000) == 0x7000) {
                var register = getX(instr);
                this.V[register] = (this.V[getX(instr)] + getKK(instr)) & 0xFFFF;
                return true;
            }
            else {
                return false;
            }
        };
        // Store value of register VY in register VX
        Machine.prototype.x8XY0 = function (instr) {
            if ((instr & 0xF00F) == 0x8000) {
                var x = getX(instr);
                var y = getY(instr);
                this.V[x] = this.V[y];
                return true;
            }
            else {
                return false;
            }
        };
        // Set VX to VX OR VY
        Machine.prototype.x8XY1 = function (instr) {
            if ((instr & 0xF00F) == 0x8001) {
                var x = getX(instr);
                var y = getY(instr);
                this.V[x] = this.V[y] | this.V[x];
                return true;
            }
            else {
                return false;
            }
        };
        // Set VX to VX AND VY
        Machine.prototype.x8XY2 = function (instr) {
            if ((instr && 0xF00F) == 0x8002) {
                var x = getX(instr);
                var y = getY(instr);
                this.V[x] = this.V[y] & this.V[x];
                return true;
            }
            else {
                return false;
            }
        };
        // Set VX to VX XOR VY
        Machine.prototype.x8XY3 = function (instr) {
            if ((instr & 0xF00F) == 0x8003) {
                var x = getX(instr);
                var y = getY(instr);
                this.V[x] = this.V[y] ^ this.V[x];
                return true;
            }
            else {
                return false;
            }
        };
        // Add the value of register VY to register VX
        // Set VF to 01 if a carry occurs
        // Set VF to 00 if a carry does not occur
        Machine.prototype.x8XY4 = function (instr) {
            if ((instr & 0xF00F) == 0x8004) {
                var x = getX(instr);
                var y = getY(instr);
                var result = this.V[x] + this.V[y];
                if (result > 255) {
                    result %= 256;
                    this.VF = 1;
                }
                else {
                    this.VF = 0;
                }
                this.V[x] = result;
                return true;
            }
            else {
                return false;
            }
        };
        // Subtract the value of register VY from register VX
        // Set VF to 0 if a borrow occurs
        // Set VF to 1 if a borrow does not occur
        Machine.prototype.x8XY5 = function (instr) {
            if ((instr & 0xF00F) == 0x8005) {
                var x = getX(instr);
                var y = getY(instr);
                var result = this.V[x] - this.V[y];
                if (result < 0) {
                    result = 256 - result;
                    this.VF = 0;
                }
                else {
                    this.VF = 1;
                }
                this.V[x] = result;
                return true;
            }
            else {
                return false;
            }
        };
        // Set register VX to the value of VY minus VX
        // Set VF to 00 if a borrow occurs
        // Set VF to 01 if a borrow does not occur
        Machine.prototype.x8XY7 = function (instr) {
            if ((instr & 0xF00F) == 0x8007) {
                var x = getX(instr);
                var y = getY(instr);
                var result = this.V[y] - this.V[x];
                if (result < 0) {
                    result = 256 - result;
                    this.VF = 0;
                }
                else {
                    this.VF = 1;
                }
                this.V[x] = result;
                return true;
            }
            else {
                return false;
            }
        };
        // Store the value of register VY shifted right one bit in register VX
        // Set register VF to the least significant bit prior to the shift
        Machine.prototype.x8XY6 = function (instr) {
            if ((instr & 0xF00F) == 0x8006) {
                var x = getX(instr);
                var y = getY(instr);
                this.VF = this.V[y] & 0x0001;
                this.V[x] = this.V[y] >> 1;
                return true;
            }
            else {
                return false;
            }
        };
        // Store the value of register VY shifted left one bit in register VX
        // Set register VF to the most significant bit prior to the shift
        Machine.prototype.x8XYE = function (instr) {
            if ((instr & 0xF00F) == 0x800E) {
                var x = getX(instr);
                var y = getY(instr);
                this.VF = this.V[y] & 0x8000 >> 24;
                this.V[x] = (this.V[y] << 1) & 0xFFFF;
                return true;
            }
            else {
                return false;
            }
        };
        // Skips the next instruction if VX doesn't equal VY
        Machine.prototype.x9XY0 = function (instr) {
            if ((instr & 0xF00F) == 0x9000) {
                if (this.V[getX(instr)] != this.V[getY(instr)]) {
                    this.PC += 2;
                }
                return true;
            }
            else {
                return false;
            }
        };
        // Set I = NNN
        Machine.prototype.xANNN = function (instr) {
            if ((instr & 0xF000) == 0xA000) {
                this.I = getNNN(instr);
                return true;
            }
            else {
                return false;
            }
        };
        // Jump to location nnn + V0.
        Machine.prototype.xBNNN = function (instr) {
            if ((instr & 0xF000) == 0xB000) {
                this.PC = getNNN(instr) + this.V[0];
                return true;
            }
            else {
                return false;
            }
        };
        // Set Vx = random byte AND kk.
        Machine.prototype.xCXKK = function (instr) {
            if ((instr & 0xF000) == 0xC000) {
                this.V[getX(instr)] = randomInt(256) & getKK(instr);
                return true;
            }
            else {
                return false;
            }
        };
        // Display n-byte sprite starting at memory location I at (Vx, Vy), set VF = collision.
        //
        // The interpreter reads n bytes from memory, starting at the address stored in I. These bytes are then
        // displayed as sprites on screen at coordinates (Vx, Vy). Sprites are XORed onto the existing screen. If this
        // causes any pixels to be erased, VF is set to 1, otherwise it is set to 0. If the sprite is positioned so part
        // of it is outside the coordinates of the display, it wraps around to the opposite side of the screen. See
        // instruction 8xy3 for more information on XOR, and section 2.4, Display, for more information on the Chip-8
        // screen and sprites.
        Machine.prototype.xDXYN = function (instr) {
            if ((instr & 0xF000) & 0xD000) {
                var x = getX(instr);
                var y = getY(instr);
                this.V[0xF] = 0;
                if (x >= Machine.SCREEN_WIDTH || y >= Machine.SCREEN_HEIGHT) {
                    // Don't draw anything if the coordinates we got are outside our range
                    return;
                }
                var spriteLen = getN(instr);
                for (var row = 0; row < spriteLen; row++) {
                    var spriteData = this.getMem(this.I + row);
                    var pixelRow = (y + row) % Machine.SCREEN_HEIGHT;
                    if (pixelRow < Machine.SCREEN_HEIGHT) {
                        for (var col = 7; col >= 0; col--) {
                            var pixelCol = (x + col) % Machine.SCREEN_WIDTH;
                            if (pixelCol < Machine.SCREEN_WIDTH) {
                                var screenPixelValue = this.screen[row][col];
                                var spritePixelValue = (spriteData & 0x1) != 0;
                                var result = screenPixelValue !== spritePixelValue;
                                if (!result && !screenPixelValue) {
                                    this.V[0xF] = 1;
                                }
                                this.screen[pixelRow][pixelCol] = result;
                                spriteData >>= 1;
                            }
                        }
                    }
                }
                this.deliverFramebuffer();
                return true;
            }
            else {
                return false;
            }
        };
        // Skips the next instruction if the key stored in VX isn't pressed.
        Machine.prototype.xEXA1 = function (instr) {
            if ((instr & 0xF0FF) == 0xE0A1) {
                if (!this.getKeyPressed(getX(instr))) {
                    this.PC += 2;
                }
                return true;
            }
            else {
                return false;
            }
        };
        // Skips the next instruction if the key stored in VX is pressed.
        Machine.prototype.xEX9E = function (instr) {
            if ((instr & 0xF0FF) == 0xE09E) {
                if (this.getKeyPressed(getX(instr))) {
                    this.PC += 2;
                }
                return true;
            }
            else {
                return false;
            }
        };
        // Sets VX to the value of the delay timer.
        Machine.prototype.xFX07 = function (instr) {
            if ((instr & 0xF0FF) == 0xF007) {
                if (this.delayTimerEnd) {
                    var diff = new Date(this.delayTimerEnd.getTime() - new Date().getTime());
                    var time = diff.getTime();
                    if (time < 0) {
                        time = 0;
                    }
                    time = Math.floor(time / 1000 * 60);
                    this.V[getX(instr)] = time;
                }
                else {
                    this.V[getX(instr)] = 0;
                }
                return true;
            }
            else {
                return false;
            }
        };
        // A key press is awaited, and then stored in VX.
        Machine.prototype.xFX0A = function (instr) {
            if ((instr & 0xF0FF) == 0xF00A) {
                this.V[getX(instr)] = this.getKey();
                return true;
            }
            else {
                return false;
            }
        };
        Machine.dateSecondsInFuture = function (seconds) {
            return new Date(new Date().getTime() + seconds * 1000);
        };
        // Sets the delay timer to VX.
        Machine.prototype.xFX15 = function (instr) {
            if ((instr & 0xF0FF) == 0xF015) {
                var Vx = this.V[getX(instr)];
                var seconds = Vx / 60;
                this.delayTimerEnd = Machine.dateSecondsInFuture(seconds);
                return true;
            }
            else {
                return false;
            }
        };
        // Sets the sound timer to VX.
        Machine.prototype.xFX18 = function (instr) {
            if ((instr & 0xF0FF) == 0xF018) {
                var Vx = this.V[getX(instr)];
                if (Vx == 0) {
                    this.soundTimerEnd = null;
                    this.stopSound();
                }
                else {
                    this.startSound();
                    var seconds = Vx / 60;
                    this.soundTimerEnd = Machine.dateSecondsInFuture(seconds);
                }
                return true;
            }
            else {
                return false;
            }
        };
        // Adds VX to I. VF is set to 1 when range overflow (I+VX>0xFFF), and
        // 0 when there isn't. This is undocumented feature of the CHIP-8 and
        // used by Spacefight 2091! game.
        Machine.prototype.xFX1E = function (instr) {
            if ((instr & 0xF0FF) == 0xF01E) {
                var Vx = this.V[getX(instr)];
                var sum = Vx + this.I;
                if (sum > 0x0FFF) {
                    this.V[0xF] = 1;
                    sum &= 0x0FFF;
                }
                else {
                    this.V[0xF] = 0;
                }
                this.I = sum;
                return true;
            }
            else {
                return false;
            }
        };
        // Sets I to the location of the sprite for the character in VX. Characters 0-F (in hexadecimal) are represented by a 4x5 font.
        Machine.prototype.xFX29 = function (instr) {
            if ((instr & 0xF0FF) == 0xF029) {
                var Vx = this.V[getX(instr)];
                this.I = this.characterSpriteAddresses[Vx];
                return true;
            }
            else {
                return false;
            }
        };
        // Stores the Binary-coded decimal representation of VX, with the most
        // significant of three digits at the address in I, the middle digit at
        // I plus 1, and the least significant digit at I plus 2. (In other
        // words, take the decimal representation of VX, place the hundreds
        // digit in memory at location in I, the tens digit at location I+1,
        // and the ones digit at location I+2.)
        Machine.prototype.xFX33 = function (instr) {
            if ((instr & 0xF0FF) == 0xF033) {
                var hundreds = this.V[getX(instr)];
                var ones = hundreds % 10;
                hundreds = Math.floor(hundreds / 10);
                var tens = hundreds % 10;
                hundreds = Math.floor(hundreds / 10);
                this.setMem(this.I, hundreds);
                this.setMem(this.I + 1, tens);
                this.setMem(this.I + 2, ones);
                assert(false, "Opcode not yet implemented");
                return true;
            }
            else {
                return false;
            }
        };
        // Stores V0 to VX in memory starting at address I.
        Machine.prototype.xFX55 = function (instr) {
            if ((instr & 0xF0FF) == 0xF055) {
                var x = getX(instr);
                for (var i = 0; i <= x; i++) {
                    var addr = this.I + i;
                    this.setMem(addr, this.V[i]);
                }
                return true;
            }
            else {
                return false;
            }
        };
        // Fills V0 to VX with values from memory starting at address I.
        Machine.prototype.xFX65 = function (instr) {
            if ((instr & 0xF0FF) == 0xF065) {
                var x = getX(instr);
                for (var i = 0; i <= x; i++) {
                    var addr = this.I + i;
                    this.V[i] = this.getMem(addr);
                }
                return true;
            }
            else {
                return false;
            }
        };
        Machine.LOW_MEM = 0x0200; // The memory space from 0x0000 to 0x01ff is reserved for the interpreter
        Machine.HIGH_MEM = 0x1000;
        Machine.SCREEN_WIDTH = 64; // 8 bytes wide
        Machine.SCREEN_HEIGHT = 32; // 4 bytes high
        return Machine;
    })();
    Chip8.Machine = Machine;
})(Chip8 || (Chip8 = {}));
//# sourceMappingURL=Chip8.js.map