interface Tester {
	ok(result: boolean, message?: string): void;
}

interface Test {
	(tester: Tester): void;
}

class TestRunner {
	constructor(private tests: Test[]) { }

	public run() {
		var succeeded = true;
		var lastMessage: string = null;

		var tester: Tester = {
			ok: function(result, message?) {
				if (!result) {
					succeeded = result;
					lastMessage = message || "No message provided.";
				}
			}
		};

		for (let test of this.tests) {
			test(tester);
			if (!succeeded) {
				break;
			}
		}

		if (succeeded) {
			console.log("All tests succeeded.");
		} else {
			console.log("Test failed: " + lastMessage);
		}
	}
}