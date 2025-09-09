export const keywords = [
  "auto",
  "break",
  "case",
  "char",
  "const",
  "continue",
  "default",
  "double",
  "do",
  "else",
  "enum",
  "extern",
  "float",
  "for",
  "goto",
  "if",
  "int",
  "long",
  "register",
  "return",
  "short",
  "signed",
  "sizeof",
  "static",
  "struct",
  "switch",
  "typedef",
  "union",
  "unsigned",
  "void",
  "volatile",
  "while",
] as const;
export type Keywords = (typeof keywords)[number];

export const operators = [
  "[",
  "]",
  "(",
  ")",
  ".",
  "->",
  "++",
  "+=",
  "+",
  "--",
  "-=",
  "-",
  "*=",
  "*",
  "/=",
  "/",
  "%=",
  "%",
  "&&",
  "&=",
  "&",
  "||",
  "|=",
  "|",
  "^=",
  "^",
  "~=",
  "~",
  "!=",
  "!",
  "==",
  "=",
  "<<=",
  "<<",
  "<=",
  "<",
  ">>=",
  ">>",
  ">=",
  ">",
  "sizeof",
  "?",
  ":",
  ",",
  "##",
  "#",
] as const;
export type Operators = (typeof operators)[number];

const tokens = new RegExp(
  [
    /* key */ `(${keywords.join("|")})`,
    /* flt */ `([0-9]+(?:\\.[0-9]*(?:[eE][-+]?[0-9]+)?|[eE][-+]?[0-9]+))[fFlL]?`,
    /* int */ `([1-9][0-9]*)(?:[uU][lL]?|[lL][uU]?)?`,
    /* hex */ `0x([0-9A-Fa-f]+)`,
    /* oct */ `(0[0-7]*)`,
    /* char */ `L?'((?:\\\\(?:[0-7]{1,3}|x[0-9A-Fa-f]+|['"?\\\\abfnrtv])|[^'"\\\\\\n]))'`,
    /* str */ `L?"((?:\\\\(?:[0-7]{1,3}|x[0-9A-Fa-f]+|['"?\\\\abfnrtv])|[^"\\\n])*)"`,
    /* op */ `(${operators.map((o) => o.replace(/[\[\]\(\)\|\*\+\?\.\^]/g, (s) => `\\${s}`)).join("|")})`,
    /* id */ `([A-Za-z_][A-Za-z0-9_]*)`,
  ].join("|"),
  "g",
);

export type Token =
  | { type: Keywords }
  | { type: "float"; value: number; text: string }
  | { type: "int"; value: number; text: string }
  | { type: "char"; value: number; text: string }
  | { type: "string"; value: string; text: string }
  | { type: Operators }
  | { type: "id"; value: string; text: string }
  | { type: "error"; text: string };

export function* tokenize(input): Generator<Token> {
  for (const match of input.matchAll(tokens)) {
    const [text, key, flt, int, hex, oct, char, str, op, id] = match;
    if (key !== undefined) {
      yield { type: key };
    } else if (flt !== undefined) {
      yield { type: "float", value: parseFloat(flt), text };
    } else if (int !== undefined) {
      yield { type: "int", value: parseInt(int), text };
    } else if (hex !== undefined) {
      yield { type: "int", value: parseInt(hex, 16), text };
    } else if (oct !== undefined) {
      yield { type: "int", value: parseInt(oct, 8), text };
    } else if (char !== undefined) {
      yield { type: "char", value: char, text };
    } else if (str !== undefined) {
      yield { type: "string", value: str, text };
    } else if (op !== undefined) {
      yield { type: op };
    } else if (id !== undefined) {
      yield { type: "id", value: id, text };
    } else {
      console.error(match);
      yield { type: "error", text };
    }
  }
}
