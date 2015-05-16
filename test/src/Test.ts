/// <reference path='include.d.ts' />

var tests:Test[] = [
    BasicTests.testBoot,
    BasicTests.testMemorySet
];

var testRunner = new TestRunner(tests);
testRunner.run();