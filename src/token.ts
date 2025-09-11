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
export type Keyword = (typeof keywords)[number];

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
] as const;
export type Operator = (typeof operators)[number];

export const punctuators = [
  "[",
  "]",
  "(",
  ")",
  "{",
  "}",
  "*",
  ",",
  ":",
  "=",
  ";",
  "...",
];
export type Punctuator = (typeof punctuators)[number];

const terminal = Symbol("terminal");
interface TokenTrie {
  [terminal]?: true;
  [key: string]: TokenTrie;
}

function optimize(...tokens: string[]) {
  const trie: TokenTrie = {};
  for (const token of tokens) {
    let current: TokenTrie = trie;
    for (const ch of token) {
      const key = "{}[]().?+-*^&|\\/".indexOf(ch) === -1 ? ch : `\\${ch}`;
      if (!(key in current)) {
        current[key] = {};
      }
      current = current[key];
    }
    current[terminal] = true;
  }
  return toRegex(Object.entries(trie));
  function toRegex(entries: [string, TokenTrie][]): string {
    const regex = entries
      .map(([k, v]) => {
        const entries = Object.entries(v);
        return entries.length === 0
          ? k
          : v[terminal]
            ? `${k}(?:${toRegex(entries)})?`
            : entries.length === 1
              ? `${k}${toRegex(entries)}`
              : `${k}(?:${toRegex(entries)})`;
      })
      .reduce((l, r) => `${l}|${r}`);
    return regex;
  }
}

const tokens = new RegExp(
  /* ws */ `(?:/\\*.*?\\*/|\\s+)*(?:${[
    /* key */ `(${optimize(...keywords, ...operators, ...punctuators)})`,
    /* flt */ `([0-9]+(?:\\.[0-9]*(?:[eE][-+]?[0-9]+)?|[eE][-+]?[0-9]+))[fFlL]?`,
    /* int, flg */ `([1-9][0-9]*)([uU][lL]?|[lL][uU]?)?`,
    /* hex */ `0x([0-9A-Fa-f]+)`,
    /* oct */ `(0[0-7]*)`,
    /* char */ `L?'((?:\\\\(?:[0-7]{1,3}|x[0-9A-Fa-f]+|['"?\\\\abfnrtv])|[^'"\\\\\\n]))'`,
    /* str */ `L?"((?:\\\\(?:[0-7]{1,3}|x[0-9A-Fa-f]+|['"?\\\\abfnrtv])|[^"\\\n])*)"`,
    /* id */ `([A-Za-z_][A-Za-z0-9_]*)`,
    /* eof */ `($)`,
    /* err */ `.+`,
  ].join("|")})`,
  "g",
);

export type Token =
  | { type: Keyword | Operator | Punctuator; text: string }
  | { type: "float" | "double" | "long double"; value: number; text: string }
  | {
      type: "int" | "unsigned int" | "long int" | "unsigned long int";
      value: number;
      text: string;
    }
  | { type: "char" | "wchar"; value: number; text: string }
  | { type: "string" | "wstring"; value: string; text: string }
  | { type: "id"; value: string; text: string }
  | { type: "eof"; text: string }
  | { type: "error"; text: string };

interface TokenizerOptions {
  intMax?: number;
  uintMax?: number;
  longMax?: number;
  ulongMax?: number;
  charMax?: number;
  wcharMax?: number;
}

export function* tokenize(
  input: string,
  options?: TokenizerOptions,
): Generator<Token> {
  const {
    intMax = 32767,
    uintMax = 65535,
    longMax = 2147483647,
    ulongMax = 4294967295,
    charMax = 127,
    wcharMax = 32767,
  } = options ?? {};
  for (const match of input.matchAll(tokens)) {
    const [text, key, flt, int, flg, hex, oct, char, str, id, eof] = match;
    if (key !== undefined) {
      yield { type: key as Keyword | Operator | Punctuator, text };
    } else if (flt !== undefined) {
      let type: "float" | "double" | "long double" = "double";
      if (text.endsWith("f") || text.endsWith("F")) {
        type = "float";
      } else if (text.endsWith("l") || text.endsWith("L")) {
        type = "long double";
      }
      yield { type, value: parseFloat(flt), text };
    } else if (int !== undefined) {
      let type: "int" | "unsigned int" | "long int" | "unsigned long int" =
        "int";
      const value = parseInt(int);
      const isLong = flg?.includes("l") || flg?.includes("L");
      const isUnsigned = flg?.includes("u") || flg?.includes("U");
      yield intToken(value, text, isLong, isUnsigned);
    } else if (hex !== undefined) {
      yield intToken(parseInt(hex, 16), text);
    } else if (oct !== undefined) {
      yield intToken(parseInt(oct, 8), text);
    } else if (char !== undefined) {
      const isWide = text.startsWith("L");
      let type: "wchar" | "char" = isWide ? "wchar" : "char";
      let value = char.charCodeAt(0);
      if (value == 92 /* \ */) {
        switch (char.charCodeAt(1)) {
          case 34 /* " */:
          case 39 /* ' */:
          case 63 /* ? */:
          case 92 /* \ */:
            value = char.charCodeAt(1);
            if (char.length > 2) {
              value = NaN;
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
            value = parseInt(char.substring(1), 8);
            break;
          case 88 /* X */:
          case 120 /* x */:
            value = parseInt(char.substring(2), 16);
            break;
          case 97 /* a */:
            value = 7 /* \a */;
            if (char.length > 2) {
              value = NaN;
            }
            break;
          case 98 /* b */:
            value = 8 /* \b */;
            if (char.length > 2) {
              value = NaN;
            }
            break;
          case 102 /* f */:
            value = 12 /* \f */;
            if (char.length > 2) {
              value = NaN;
            }
            break;
          case 110 /* n */:
            value = 10 /* \n */;
            if (char.length > 2) {
              value = NaN;
            }
            break;
          case 114 /* r */:
            value = 13 /* \r */;
            if (char.length > 2) {
              value = NaN;
            }
            break;
          case 116 /* t */:
            value = 9 /* \t */;
            if (char.length > 2) {
              value = NaN;
            }
            break;
          case 118 /* v */:
            value = 11 /* \v */;
            if (char.length > 2) {
              value = NaN;
            }
            break;
          default:
            value = NaN;
            continue;
        }
      } else if (char.length > 1) {
        value = NaN;
      }
      if (Number.isNaN(value) || value > (isWide ? wcharMax : charMax)) {
        yield { type: "error", text };
      } else {
        yield {
          type,
          value,
          text,
        };
      }
    } else if (str !== undefined) {
      const isWide = text.startsWith("L");
      const type: "string" | "wstring" = isWide ? "wstring" : "string";
      let hasErrors = false;
      let value = str;
      if (str.indexOf("\\") !== -1) {
        value = value.replaceAll(
          /\\(?:([0-7]{1,3})|x([0-9A-Fa-f]+)|(['"?\\abfnrtv]))/g,
          (src, oct, hex, esc) => {
            let value: number = 0;
            if (oct !== undefined) {
              value = parseInt(oct, 8);
            } else if (hex !== undefined) {
              value = parseInt(hex, 16);
            } else if (esc !== undefined) {
              switch (esc) {
                case `'`:
                case `"`:
                case `?`:
                case `\\`:
                  value = esc.charCodeAt(0);
                  break;
                case "a":
                  value = 7;
                  break;
                case "b":
                  value = 8;
                  break;
                case "f":
                  value = 12;
                  break;
                case "n":
                  value = 10;
                  break;
                case "r":
                  value = 13;
                  break;
                case "t":
                  value = 9;
                  break;
                case "v":
                  value = 11;
                  break;
              }
            }
            if (Number.isNaN(value) || value > (isWide ? wcharMax : charMax)) {
              hasErrors = true;
              return "";
            }
            return String.fromCharCode(value);
          },
        );
      }
      if (hasErrors) {
        yield { type: "error", text };
      } else {
        yield { type, value, text };
      }
    } else if (id !== undefined) {
      yield { type: "id", value: id, text };
    } else if (eof !== undefined) {
      yield { type: "eof", text };
    } else {
      yield { type: "error", text };
    }
  }

  function intToken(
    value: number,
    text: string,
    isLong?: boolean,
    isUnsigned?: boolean,
  ): Token {
    let type: "int" | "unsigned int" | "long int" | "unsigned long int" = "int";
    if (value > ulongMax) {
      return { type: "error", text };
    } else if (value > longMax || (isUnsigned && (isLong || value > uintMax))) {
      return { type: "unsigned long int", value, text };
    } else if (value > uintMax || isLong) {
      type = "long int";
      return { type: "long int", value, text };
    } else if (value > intMax || isUnsigned) {
      type = "unsigned int";
      return { type: "unsigned int", value, text };
    } else {
      return { type: "int", value, text };
    }
  }
}
