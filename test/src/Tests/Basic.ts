/// <reference path='../include.d.ts' />

module BasicTests {
    var hardware:Chip8.ExternalHardware = {
        deliverFramebuffer(framebuffer:boolean[][]) {
            // Don't care about the framebuffer
        },
        waitForKeyPress() {
            // Don't care about keypresses
            return 0xF;
        },
        isKeyDown(key) {
            // Don't care about keypresses
            return false;
        }
    };

    function createMachine(memory:Uint16Array) {
        return new Chip8.Machine(hardware, convertUint16ArrayToUint8Array(memory));
    }

    export var testBoot:Test = function (tester) {
        var memory = new Uint16Array([0x00EE]);
        var machine = createMachine(memory);
        tester.ok(!machine.executeInstructions(100));
    };

    export var testMemorySet:Test = function (tester) {
        var memoryInit = new Uint16Array([
            0x1222, // 0x0200
            0x0001, // 0x0202
            0x0203, // 0x0204
            0x0405, // 0x0206
            0x0607, // 0x0208
            0x0809, // 0x020A
            0x0A0B, // 0x020C
            0x0C0D, // 0x020E
            0x0E0F, // 0x0210
            0xFFFF, // 0x0212
            0xFFFF, // 0x0214
            0xFFFF, // 0x0216
            0xFFFF, // 0x0218
            0xFFFF, // 0x021A
            0xFFFF, // 0x021C
            0xFFFF, // 0x021E
            0xFFFF, // 0x0220
            0xA202, // Load 0x0202 into I
            0xFF65, // Copy from I to V0 through Vf
            0xA212, // Load 0x0212 into I
            0xFF55, // Copy from V0 through Vf starting at I
            0x00EE, // Terminate
        ]);

        var memoryExpected = convertUint16ArrayToUint8Array(new Uint16Array([
            0x1222, // 0x0200
            0x0001, // 0x0202
            0x0203, // 0x0204
            0x0405, // 0x0206
            0x0607, // 0x0208
            0x0809, // 0x020A
            0x0A0B, // 0x020C
            0x0C0D, // 0x020E
            0x0E0F, // 0x0210
            0x0001, // 0x0212
            0x0203, // 0x0214
            0x0405, // 0x0216
            0x0607, // 0x0218
            0x0809, // 0x021A
            0x0A0B, // 0x021C
            0x0C0D, // 0x021E∂
            0x0E0F, // 0x0220
            0xA202, // Load 0x0202 into I
            0xFF65, // Copy from I to V0 through Vf
            0xA212, // Load 0x0212 into I
            0xFF55, // Copy from V0 through Vf starting at I
            0x00EE, // Terminate
        ]));
        var machine = createMachine(memoryInit);
        machine.executeInstructions(1000);
        var memoryAfter = machine.getMemoryCopy();

        var memoryToCompare = memoryAfter.subarray(Chip8.Machine.LOW_MEM, Chip8.Machine.LOW_MEM + memoryExpected.length);

        for (var i = 0; i < memoryToCompare.length; i++) {
            tester.ok(memoryExpected[i] === memoryToCompare[i], "Didn't get the memory I expected at " + (0x200 + i) + ". Got [" + memoryToCompare[i] + "], expected [" + memoryExpected[i] + "].");
        }
    }
}