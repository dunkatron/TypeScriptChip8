/// <reference path='../src/Chip8.ts' />
/// <reference path='TestRunner.ts' />
/// <reference path='./Tests/Basic.ts' />

var tests:Test[] = [
    BasicTests.testBoot,
    BasicTests.testMemorySet
];

var testRunner = new TestRunner(tests);
testRunner.run();