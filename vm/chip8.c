#include <stdlib.h>
#include <stdbool.h>
#include <string.h>

#include "chip8.h"

#define LOW_MEM 0x0200
#define HIGH_MEM 0x1000

typedef uint8_t byte_t;
typedef uint16_t word_t;
typedef word_t vm_addr_t;
typedef uint16_t instr_t;

typedef struct _chip8_result {
    bool succeeded;
    bool terminate;
} chip8_result;

#define V (vm->_V)
#define INSTR(X) chip8_instr_ ## X
#define IMPL(X) static inline void INSTR(X)(chip8 *vm, const instr_t instr)
#define X ((instr >> 16) & 0x000F)
#define Y ((instr >> 8) & 0x000F)
#define N (instr & 0x000F)
#define KK (instr & 0x00FF)
#define NNN (instr & 0x0FFF)

#define I (vm->_I)
#define MEM (vm->_mem)
#define PC (vm->_PC)

typedef void (*InstructionFunction)(chip8 *, instr_t);

uint8_t LetterSprites[] = {
    0xF0, 0x90, 0x90, 0x90, 0xF0, // 0
    0x20, 0x60, 0x20, 0x20, 0x70, // 1
    0xF0, 0x10, 0xF0, 0x80, 0xF0, // 2
    0xF0, 0x10, 0xF0, 0x10, 0xF0, // 3
    0x90, 0x90, 0xF0, 0x10, 0x10, // 4
    0xF0, 0x80, 0xF0, 0x10, 0xF0, // 5
    0xF0, 0x80, 0xF0, 0x90, 0xF0, // 6
    0xF0, 0x10, 0x20, 0x40, 0x40, // 7
    0xF0, 0x90, 0xF0, 0x90, 0xF0, // 8
    0xF0, 0x90, 0xF0, 0x10, 0xF0, // 9
    0xF0, 0x90, 0xF0, 0x90, 0x90, // A
    0xE0, 0x90, 0xE0, 0x90, 0xE0, // B
    0xF0, 0x80, 0x80, 0x80, 0xF0, // C
    0xE0, 0x90, 0x90, 0x90, 0xE0, // D
    0xF0, 0x80, 0xF0, 0x80, 0xF0, // E
    0xF0, 0x80, 0xF0, 0x80, 0x80, // F
};

static inline vm_addr_t letterSpriteAddr(uint8_t sprite) {
    return 5 * sprite;
}

chip8 chip8_newVM(const uint8_t *programMemory, uint16_t programMemorySize, chip8_keyCheckFunction keyCheckFunction, chip8_keyFunction keyFunction) {
    chip8 c = {0};
    c._PC = LOW_MEM;
    c._keyCheckFunction = keyCheckFunction;
    c._keyFunction = keyFunction;
    
    memcpy(c._mem, LetterSprites, sizeof(LetterSprites));
    
    memcpy(c._mem + LOW_MEM, programMemory, programMemorySize);
    
    return c;
}

static inline vm_addr_t popStack(chip8 *vm) {
    vm->_stackPtr--;
    return vm->_stack[vm->_stackPtr];
}

static inline void pushStack(chip8 *vm, vm_addr_t addrToPush) {
    vm->_stack[vm->_stackPtr] = addrToPush;
    vm->_stackPtr++;
}

// Instruction implementations

// Return from the current subroutine
IMPL(00EE) {
    // Return from the top level routine (terminate)
    if (vm->_stackPtr == 0) {
        vm->_terminate = true;
    } else {
        PC = popStack(vm);
    }
}

// Clears the screen
IMPL(00E0) {
    memset(vm->_screen, 0, sizeof(vm->_screen));
}

// Jumps to address NNN
IMPL(1NNN) {
    PC = NNN;
}

IMPL(2NNN) {
    pushStack(vm, PC);
    PC = NNN;
}

// Skips the next instruction if VX equals KK.
IMPL(3XKK) {
    if (V[X] == KK) {
        PC += 2;
    }
}

// Skips the next instruction if VX doesn't equal KK.
IMPL(4XKK) {
    if (V[X] != KK) {
        PC += 2;
    }
}

// Skips the next instruction if VX equals VY.
IMPL(5XY0) {
    if (V[X] == V[Y]) {
        PC += 2;
    }
}

// Store value KK in register VX
IMPL(6XKK) {
    V[X] = KK;
}

// Add the value KK to register VX
IMPL(7XKK) {
    V[X] = V[X] + KK;
}

// Store value of register VY in register VX
IMPL(8XY0) {
    V[X] = V[Y];
}

// Set VX to VX OR VY
IMPL(8XY1) {
    V[X] = V[X] | V[Y];
}

// Set VX to VX AND VY
IMPL(8XY2) {
    V[X] = V[X] & V[Y];
}

// Set VX to VX XOR VY
IMPL(8XY3) {
    V[X] = V[X] ^ V[Y];
}

// Set Vx = Vx + Vy, set VF = carry.
IMPL(8XY4) {
    word_t result = V[X];
    result += V[Y];
    V[0xF] = result > 255 ? 1 : 0;
    V[X] = result;
}

// Set Vx = Vx - Vy, set VF = NOT borrow.
IMPL(8XY5) {
    V[0xF] = V[X] > V[Y] ? 1 : 0;
    V[X] = V[X] - V[Y];
}

// Set Vx = Vx SHR 1.
IMPL(8XY6) {
    V[0xF] = V[X] & 0x1;
    V[X] = V[X] >> 1;
}

// Set Vx = Vy - Vx, set VF = NOT borrow.
IMPL(8XY7) {
    V[0xF] = V[Y] > V[X] ? 1 : 0;
    V[X] = V[Y] - V[X];
}

// Set Vx = Vx SHL 1.
IMPL(8XYE) {
    V[0xF] = (V[X] & 0x80) != 0 ? 1 : 0;
    V[X] = V[X] << 1;
}

// Skip next instruction if Vx != Vy.
IMPL(9XY0) {
    if (V[X] != V[Y]) {
        PC += 2;
    }
}

// Jump to location NNN + V0.
IMPL(ANNN) {
    PC = NNN;
}

// Set I = nnn.
IMPL(BNNN) {
    PC = V[0] + NNN;
}

// Set Vx = random byte AND KK.
IMPL(CXKK) {
    byte_t randomValue = (((double)rand()) / RAND_MAX) * 256;
    V[X] = randomValue & KK;
}

// TODO
// Display n-byte sprite starting at memory location I at (Vx, Vy), set VF = collision.
IMPL(DXYN) {
    
}

// TODO
// Skip next instruction if key with the value of Vx is pressed.
IMPL(EX9E) {
    
}

// TODO
// Skip next instruction if key with the value of Vx is not pressed.
IMPL(EXA1) {
    
}

// TODO
// Set Vx = delay timer value.
IMPL(FX07) {
    
}

// TODO
// Wait for a key press, store the value of the key in Vx.
IMPL(FX0A) {
    V[X] = vm->_keyFunction();
}

// TODO
// Set delay timer = Vx.
IMPL(FX15) {
    
}

// TODO
// Set sound timer = Vx.
IMPL(FX18) {
    
}

// Set I = I + Vx.
IMPL(FX1E) {
    I = I + V[X];
}

// Set I = location of sprite for digit Vx.
IMPL(FX29) {
    I = letterSpriteAddr(V[X]);
}

// Store BCD representation of Vx in memory locations I, I+1, and I+2.
IMPL(FX33) {
    byte_t val = V[X];
    MEM[I + 2] = val % 10;
    val /= 10;
    MEM[I + 1] = val % 10;
    val /= 10;
    MEM[I] = val % 10;
}

// Store registers V0 through Vx in memory starting at location I.
IMPL(FX55) {
    for (uint8_t i = 0; i < X; i++) {
        MEM[I + i] = V[i];
    }
}

// Read registers V0 through Vx from memory starting at location I.
IMPL(FX65) {
    for (uint8_t i = 0; i < X; i++) {
        V[i] = MEM[I + i];
    }
}

InstructionFunction Instr8___Fns[] = {
    INSTR(8XY0),
    INSTR(8XY1),
    INSTR(8XY2),
    INSTR(8XY3),
    INSTR(8XY4),
    INSTR(8XY5),
    INSTR(8XY6),
    INSTR(8XY7),
    NULL, // 8
    NULL, // 9
    NULL, // A
    NULL, // B
    NULL, // C
    NULL, // D
    INSTR(8XYE),
    NULL, // F
};

IMPL(0___) {
    switch (instr) {
        case 0x00E0:
            INSTR(00E0)(vm, instr);
            break;
        case 0x00EE:
            INSTR(00EE)(vm, instr);
            break;
    }
}

IMPL(8___) {
    byte_t val = instr & 0x000F;
    InstructionFunction pfn = Instr8___Fns[val];
    if (pfn != NULL) {
        (*pfn)(vm, instr);
    }
}

IMPL(E___) {
    switch (instr & 0x00FF) {
        case 0x9E:
            INSTR(EX9E)(vm, instr);
            break;
        case 0xA1:
            INSTR(EXA1)(vm, instr);
            break;
    }
}

IMPL(F___) {
    switch (instr & 0x00FF) {
        case 0x07:
            INSTR(FX07)(vm, instr);
            break;
        case 0x0A:
            INSTR(FX0A)(vm, instr);
            break;
        case 0x15:
            INSTR(FX15)(vm, instr);
            break;
        case 0x18:
            INSTR(FX18)(vm, instr);
            break;
        case 0x1E:
            INSTR(FX1E)(vm, instr);
            break;
        case 0x29:
            INSTR(FX29)(vm, instr);
            break;
        case 0x33:
            INSTR(FX33)(vm, instr);
            break;
        case 0x55:
            INSTR(FX55)(vm, instr);
            break;
        case 0x65:
            INSTR(FX65)(vm, instr);
            break;
    }
}

InstructionFunction TopLevel[] = {
    INSTR(0___),
    INSTR(1NNN),
    INSTR(2NNN),
    INSTR(3XKK),
    INSTR(4XKK),
    INSTR(5XY0),
    INSTR(6XKK),
    INSTR(7XKK),
    INSTR(8___),
    INSTR(9XY0),
    INSTR(ANNN),
    INSTR(BNNN),
    INSTR(CXKK),
    INSTR(DXYN),
    INSTR(E___),
    INSTR(F___)
};

void chip8_runInstruction(chip8 *vm, instr_t instr) {
    (*(TopLevel[(instr >> 12) & 0xF]))(vm, instr);
}

void chip8_iterate(chip8 *vm) {
    instr_t instr = (MEM[PC] << 8) | MEM[PC + 1];
    PC += 2;
    
    bool handled = false;
    
    chip8_runInstruction(vm, instr);
}