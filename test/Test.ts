/// <reference path='../src/Chip8.ts' />
/// <reference path='TestRunner.ts' />

var testBoot: Test = function(tester) {
	var machine = new Chip8.Machine();
	machine.run();
}

var tests: Test[] = [
	testBoot
];

var testRunner = new TestRunner(tests);
testRunner.run();