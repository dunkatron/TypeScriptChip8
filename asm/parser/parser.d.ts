declare module parser {
    export interface Line {
        labels: {[name:string]: Label};
        instruction: Instruction;
        addr?:number;
        value?:string;
    }

    interface Instruction {
        template: string;
        replacements: {[key:string]: Replacement};
    }

    interface Replacement {
        type:string;
        value?:number;
        name?:string;
        forward?:boolean;
    }

    interface Label {
        type:string;
        name:string;
    }

    export function parse(input:string):Line[];
}