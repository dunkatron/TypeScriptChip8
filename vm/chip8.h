#include <stdlib.h>
#include <stdbool.h>

typedef void (*chip8_keyCheckFunction)(uint8_t key);
typedef uint8_t (*chip8_keyFunction)();

#define CHIP8_SCREEN_WIDTH 64
#define CHIP8_SCREEN_HEIGHT 32
#define CHIP8_MEMORY_SIZE 4096
#define CHIP8_STACK_SIZE 256

typedef struct _chip8 {
    bool _screen[CHIP8_SCREEN_WIDTH * CHIP8_SCREEN_HEIGHT];
    uint8_t _V[16];
    uint16_t _I;
    uint16_t _PC;
    uint8_t _mem[CHIP8_MEMORY_SIZE];
    uint16_t _stack[CHIP8_STACK_SIZE];
    uint8_t _stackPtr;
    
    bool _terminate;
    
    chip8_keyCheckFunction _keyCheckFunction;
    chip8_keyFunction _keyFunction;
} chip8;

chip8 chip8_newVM(const uint8_t *programMemory, uint16_t programMemorySize, chip8_keyCheckFunction keyCheckFunction, chip8_keyFunction keyFunction);
void chip8_iterate(chip8 *vm);