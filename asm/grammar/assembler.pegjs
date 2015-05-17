start = statements

label = (symbolic_label / numeric_label)

symbolic_str = value:([a-zA-Z]+) { return value.join(""); }

symbolic_label = name:symbolic_str ":" {
    return {
        type: 'symbolic',
        name: name
    };
}

numeric_str = value:([0-9]+) { return value.join(""); }

numeric_label = name:numeric_str ":" {
    return {
        type: 'numeric',
        name: name
    };
}

hex_digit = [0-9A-Fa-f]

addr_string = value:(hex_digit+) ("H" / "h") {
    if (value.length > 3) {
        expected("Hex addresses must be <= FFF.");
    }
    return parseInt(value.join(""), 16);
}

raw_addr = value:addr_string { return { type: "raw", value: value }; }

byte = value:(hex_digit+) ("H" / "h") {
    if (value.length > 2) {
        expected("Bytes must be <= FF.");
    }
    return {
        type: "raw",
        value: parseInt(value.join(""), 16)
    };
}

label_ref = symbolic_ref / numeric_ref

symbolic_ref = value:symbolic_str { return { type: "symbolic", name: value }; }

numeric_ref = value:numeric_str direction:("f" / "b") {
    var forward = false;

    if (direction === "f") {
        forward = true;
    } else {
        forward = false;
    }

    return { type: "numeric", name: value, forward: forward };
}

addr_arg = raw_addr / label_ref

register = "V" index:hex_digit {
    return {
        type: "raw",
        value: parseInt(index, 16)
    }
}

padded_label= label:label space_or_newline* { return label; }

space = [ \t]
newline = "\n"
comma = space* "," space*

space_or_newline = space / newline

expr = labels:(padded_label*) instruction:instruction {
    var labelsObject = {};

    for (var i = 0; i < labels.length; i++) {
        var label = labels[i];
        labelsObject[label.name] = label;
    }

    return {
        labels: labelsObject,
        instruction: instruction
    };
}

instruction = instruction: (
    x00E0 /
    x00EE /
    x1NNN /
    x2NNN /
    x3XKK /
    x4XKK /
    x5XY0 /
    x6XKK /
    x7XKK /
    x8XY0 /
    x8XY1 /
    x8XY2 /
    x8XY3 /
    x8XY4 /
    x8XY5 /
    x8XY6 /
    x8XY7 /
    x8XYE
) {
    return instruction;
}

// 00E0 - CLS
x00E0 = "CLS" {
    return {
        template: "00E0"
    }
}

// 00EE - RET
x00EE = "RET" {
    return {
        template: "00EE"
    }
}

// 1nnn - JP addr
x1NNN = "JP" space+ addr:addr_arg {
    return {
        template: "1NNN",
        replacements: {
            "NNN": addr
        }
    }
}

// 2nnn - CALL addr
x2NNN = "CALL" space+ addr:addr_arg {
    return {
        template: "2NNN",
        replacements: {
            "NNN": addr
        }
    }
}

// 3xkk - SE Vx, byte
x3XKK = "SE" space+ x:register comma byte:byte {
    return {
        template: "3XKK",
        replacements: {
            "X": x,
            "KK": byte
        }
    }
}

// 4xkk - SNE Vx, byte
x4XKK = "SNE" space+ x:register comma byte:byte {
    return {
        template: "4XKK",
        replacements: {
            "X": x,
            "KK": byte
        }
    }
}

// 5xy0 - SE Vx, Vy
x5XY0 = "SE" space+ x:register comma y:register {
    return {
        template: "5XY0",
        replacements: {
            "X": x,
            "Y": y
        }
    }
}

// 6xkk - LD Vx, byte
x6XKK = "LD" space+ x:register comma byte:byte {
    return {
        template: "6XKK",
        replacements: {
            "X": x,
            "KK": byte
        }
    }
}

// 7xkk - ADD Vx, byte
x7XKK = "ADD" space+ x:register comma byte:byte {
    return {
        template: "7XKK",
        replacements: {
            "X": x,
            "KK": byte
        }
    }
}

// 8xy0 - LD Vx, Vy
x8XY0 = "LD" space+ x:register comma y:register {
    return {
        template: "8XY0",
        replacements: {
            "X": x,
            "Y": y
        }
    }
}

// 8xy1 - OR Vx, Vy
x8XY1 = "OR" space+ x:register comma y:register {
    return {
        template: "8XY1",
        replacements: {
            "X": x,
            "Y": y
        }
    }
}

// 8xy2 - AND Vx, Vy
x8XY2 = "AND" space+ x:register comma y:register {
    return {
        template: "8XY2",
        replacements: {
            "X": x,
            "Y": y
        }
    }
}

// 8xy3 - XOR Vx, Vy
x8XY3 = "XOR" space+ x:register comma y:register {
    return {
        template: "8XY3",
        replacements: {
            "X": x,
            "Y": y
        }
    }
}

// 8xy4 - ADD Vx, Vy
x8XY4 = "ADD" space+ x:register comma y:register {
    return {
        template: "8XY4",
        replacements: {
            "X": x,
            "Y": y
        }
    }
}

// 8xy5 - SUB Vx, Vy
x8XY5 = "SUB" space+ x:register comma y:register {
    return {
        template: "8XY5",
        replacements: {
            "X": x,
            "Y": y
        }
    }
}

// 8xy6 - SHR Vx, Vy
x8XY6 = "SHR" space+ x:register comma y:register {
    return {
        template: "8XY6",
        replacements: {
            "X": x,
            "Y": y
        }
    }
}

// 8xy7 - SUBN Vx, Vy
x8XY7 = "SUBN" space+ x:register comma y:register {
    return {
        template: "8XY7",
        replacements: {
            "X": x,
            "Y": y
        }
    }
}

// 8xyE - SHL Vx, Vy
x8XYE = "SLR" space+ x:register comma y:register {
    return {
        template: "8XYE",
        replacements: {
            "X": x,
            "Y": y
        }
    }
}

expr_line = expr:expr { return expr; }
line = space_or_newline* value:(expr_line) space_or_newline* { return value; }

statements = lines:(line *) {
    var startAddress = 0x0200;
    var symbolicLabels = {};
    // Find all the symbolic labels

    for (var i = 0; i < lines.length; i++) {
        var currentAddress = startAddress + i * 2;
        var line = lines[i];

        line.addr = currentAddress;

        for (var k in line.labels) {
            var label = line.labels[k];
            if (label.type === "symbolic") {
                if (symbolicLabels[label.name]) {
                    expected("The label " + label.name + " is not unique.");
                }
                symbolicLabels[label.name] = currentAddress;
            }
        }
    }

    // Perform all the replacements

    for (var i = 0; i < lines.length; i++) {
        var line = lines[i];
        var instruction = line.instruction;
        var value = instruction.template;

        if (instruction.replacements) {
            for (var k in instruction.replacements) {
                var replacement = instruction.replacements[k];
                var addr = 0;
                switch (replacement.type) {
                    case "symbolic":
                        if (!symbolicLabels[replacement.name]) {
                            expected("label " + replacement.name + " to exist but it doesn't.");
                        }
                        addr = symbolicLabels[replacement.name];
                    break;
                    case "numeric":
                        var direction = replacement.forward ? 1 : -1;
                        var found = false;
                        for (var j = i; j >= 0 && j < lines.length; j += direction) {
                            var otherLine = lines[j];
                            if (otherLine.labels[replacement.name]) {
                                found = true;
                                addr = otherLine.addr;
                                break;
                            }
                        }

                        if (!found) {
                            expected("to find the label " + replacement.name + (replacement.forward ? " ahead " : " behind ") + " this one.");
                        }
                    break;
                    case "raw":
                        addr = replacement.value;
                    break;
                }
                var hexAddr = "0000" + addr.toString(16);
                value = value.replace(k, hexAddr.substr(hexAddr.length - k.length));
            }
        }

        line.value = value;

    }

    return lines.map(function (item) { return item.value; });
}