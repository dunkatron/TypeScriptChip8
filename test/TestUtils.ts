function DumpMemory(memory:Uint8Array) {
    var output = "";
    for (var i = 0; i < memory.length; i++) {
        var numString = memory[i].toString(16);
        if (numString.length == 1) {
            numString = "0" + numString;
        }
        output += numString;
        if ((i % 8) == 7 && i > 0) {
            output += "\n";
        } else if ((i % 2) != 0) {
            output += " ";
        }
    }

    return output;
}