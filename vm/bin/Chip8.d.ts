declare module Chip8 {
    interface ExternalHardware {
        /**
         * The VM is delivering an updated framebuffer to the display
         * @param framebuffer a 2D boolean[Machine.SCREEN_HEIGHT][Machine.SCREEN_WIDTH] where each element corresponds
         * to a pixel on screen. True means the pixel is on, false means it's off.
         */
        deliverFramebuffer(framebuffer: boolean[][]): void;
        /**
         * Block until the user next presses a key, and return it.
         * @returns {number} the value of the key the user pressed from 0x0-0xF.
         */
        waitForKeyPress(): number;
        /**
         * Checks if the given key is down and returns true, false otherwise.
         * @param key the key to check, from 0x0-0xF
         * @return {boolean} true if the key is down when this function is called, false otherwise
         */
        isKeyDown(key: number): boolean;
    }
    class Machine {
        private externalHardware;
        private programData;
        static LOW_MEM: number;
        static HIGH_MEM: number;
        static SCREEN_WIDTH: number;
        static SCREEN_HEIGHT: number;
        private screen;
        private V;
        private VF;
        private I;
        private mem;
        private stack;
        private PC;
        private delayTimerEnd;
        private soundTimerEnd;
        private terminate;
        private opcodes;
        private characterSpriteAddresses;
        constructor(externalHardware: ExternalHardware, programData?: Uint8Array);
        getPC(): number;
        getMemoryCopy(): Uint8Array;
        getVRegisters(): Uint8Array;
        private pushStack(value);
        private popStack();
        private getKeyPressed(key);
        private getKey();
        private deliverFramebuffer();
        private startSound();
        private stopSound();
        private setMem(addr, value);
        private getMem(addr);
        /**
         * Call this to execute the next "count" instructions in this VM. Do not call again after execution has
         * terminated (after this method returns false)!
         * @param count the number of instructions to execute
         * @returns {boolean} true if this method can be called again to continue execution.
         */
        executeInstructions(count: number): boolean;
        private x2NNN(instr);
        private x00EE(instr);
        private x00E0(instr);
        private x1NNN(instr);
        private x3XKK(instr);
        private x4XKK(instr);
        private x5XY0(instr);
        private x6XKK(instr);
        private x7XKK(instr);
        private x8XY0(instr);
        private x8XY1(instr);
        private x8XY2(instr);
        private x8XY3(instr);
        private x8XY4(instr);
        private x8XY5(instr);
        private x8XY7(instr);
        private x8XY6(instr);
        private x8XYE(instr);
        private x9XY0(instr);
        private xANNN(instr);
        private xBNNN(instr);
        private xCXKK(instr);
        private xDXYN(instr);
        private xEXA1(instr);
        private xEX9E(instr);
        private xFX07(instr);
        private xFX0A(instr);
        static dateSecondsInFuture(seconds: number): Date;
        private xFX15(instr);
        private xFX18(instr);
        private xFX1E(instr);
        private xFX29(instr);
        private xFX33(instr);
        private xFX55(instr);
        private xFX65(instr);
    }
}
