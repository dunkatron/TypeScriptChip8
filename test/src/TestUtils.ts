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

function convertUint16ArrayToUint8Array(inputArray:Uint16Array):Uint8Array {
    var outputArray = new Uint8Array(inputArray.length * 2);

    for (var i = 0; i < inputArray.length; i++) {
        var value16 = inputArray[i];
        outputArray[i * 2 + 1] = value16 & 0xFF;
        value16 >>= 8;
        outputArray[i * 2] = value16 & 0xFF;
    }

    return outputArray;
}