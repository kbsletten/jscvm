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
    /* char */ `L?'((?:\\\\(?:[0-7]+|x[0-9A-Fa-f]+|['"?\\\\abfnrtv])|[^'"\\\\\\n]))'`,
    /* str */ `L?"((?:\\\\(?:[0-7]+|x[0-9A-Fa-f]+|['"?\\\\abfnrtv])|[^"\\\n])*)"`,
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

export function* tokenize(input: string): Generator<Token> {
  for (const match of input.matchAll(tokens)) {
    const [text, key, flt, int, hex, oct, char, str, op, id] = match;
    if (key !== undefined) {
      yield { type: key as Keywords };
    } else if (flt !== undefined) {
      yield { type: "float", value: parseFloat(flt), text };
    } else if (int !== undefined) {
      yield { type: "int", value: parseInt(int), text };
    } else if (hex !== undefined) {
      yield { type: "int", value: parseInt(hex, 16), text };
    } else if (oct !== undefined) {
      yield { type: "int", value: parseInt(oct, 8), text };
    } else if (char !== undefined) {
      let ch = char.charCodeAt(0);
      if (ch == 92 /* \ */) {
        switch (char.charCodeAt(1)) {
          case 34 /* " */:
          case 39 /* ' */:
          case 63 /* ? */:
          case 92 /* \ */:
            ch = char.charCodeAt(1);
            if (char.length > 2) {
              ch = Infinity;
            }
            break;
          case 48 /* 0 */:
          case 49 /* 1 */:
          case 50 /* 2 */:
          case 51 /* 3 */:
          case 52 /* 4 */:
          case 53 /* 5 */:
          case 54 /* 6 */:
          case 55 /* 7 */:
            ch = parseInt(char.substring(1), 8);
            break;
          case 88 /* X */:
          case 120 /* x */:
            ch = parseInt(char.substring(2), 16);
            break;
          case 97 /* a */:
            ch = 7 /* \a */;
            if (char.length > 2) {
              ch = Infinity;
            }
            break;
          case 98 /* b */:
            ch = 8 /* \b */;
            if (char.length > 2) {
              ch = Infinity;
            }
            break;
          case 101 /* e */:
            ch = 27 /* \e */;
            if (char.length > 2) {
              ch = Infinity;
            }
            break;
          case 102 /* f */:
            ch = 12 /* \f */;
            if (char.length > 2) {
              ch = Infinity;
            }
            break;
          case 110 /* n */:
            ch = 10 /* \n */;
            if (char.length > 2) {
              ch = Infinity;
            }
            break;
          case 114 /* r */:
            ch = 13 /* \r */;
            if (char.length > 2) {
              ch = Infinity;
            }
            break;
          case 116 /* t */:
            ch = 9 /* \t */;
            if (char.length > 2) {
              ch = Infinity;
            }
            break;
          case 118 /* v */:
            ch = 11 /* \v */;
            if (char.length > 2) {
              ch = Infinity;
            }
            break;
          default:
            ch = Infinity;
            continue;
        }
      } else if (char.length > 1) {
        ch = Infinity;
      }
      if (Number.isNaN(ch) || ch < 0 || ch > 255) {
        yield { type: "error", text };
      } else {
        yield { type: "char", value: ch, text };
      }
    } else if (str !== undefined) {
      yield { type: "string", value: str, text };
    } else if (op !== undefined) {
      yield { type: op as Operators };
    } else if (id !== undefined) {
      yield { type: "id", value: id, text };
    } else {
      console.error(match);
      yield { type: "error", text };
    }
  }
}
