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

export type Double = "float" | "double" | "long double";
export type Integer =
  | "int"
  | "unsigned int"
  | "long int"
  | "unsigned long int";
export type Char = "char" | "wchar";
export type String = "string" | "wstring";

export type Token =
  | { type: Keyword | Operator | Punctuator; text: string }
  | { type: Double; value: number; text: string }
  | {
      type: Integer;
      value: number;
      text: string;
    }
  | { type: Char; value: number; text: string }
  | { type: String; value: string; text: string }
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

const stringEscape = /\\(?:[0-7]{1,3}|x[0-9A-Fa-f]+|['"?\\abfnrtv])/g;

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
    const text = match[0];
    const key = match[1];
    const flt = match[2];
    const int = match[3];
    const flg = match[4];
    const hex = match[5];
    const oct = match[6];
    const char = match[7];
    const str = match[8];
    const id = match[9];
    const eof = match[10];
    if (key !== undefined) {
      yield { type: key as Keyword | Operator | Punctuator, text };
    } else if (flt !== undefined) {
      let type: Double = "double";
      if (text.endsWith("f") || text.endsWith("F")) {
        type = "float";
      } else if (text.endsWith("l") || text.endsWith("L")) {
        type = "long double";
      }
      yield { type, value: parseFloat(flt), text };
    } else if (int !== undefined) {
      const value = parseInt(int);
      const isLong = flg?.includes("l") || flg?.includes("L");
      const isUnsigned = flg?.includes("u") || flg?.includes("U");
      yield intToken(
        value,
        text,
        ulongMax,
        longMax,
        uintMax,
        intMax,
        isLong,
        isUnsigned,
      );
    } else if (hex !== undefined) {
      yield intToken(
        parseInt(hex, 16),
        text,
        ulongMax,
        longMax,
        uintMax,
        intMax,
      );
    } else if (oct !== undefined) {
      yield intToken(
        parseInt(oct, 8),
        text,
        ulongMax,
        longMax,
        uintMax,
        intMax,
      );
    } else if (char !== undefined) {
      const isWide = text.startsWith("L");
      let type: Char = isWide ? "wchar" : "char";
      let value = char.charCodeAt(0);
      if (value == 92 /* \ */) {
        value = parseEscape(char);
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
      const type: String = isWide ? "wstring" : "string";
      let hasErrors = false;
      let value = str;
      if (str.indexOf("\\") !== -1) {
        value = value.replaceAll(stringEscape, (char) => {
          let value: number = parseEscape(char);
          if (Number.isNaN(value) || value > (isWide ? wcharMax : charMax)) {
            hasErrors = true;
            return "";
          }
          return String.fromCharCode(value);
        });
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
}

function intToken(
  value: number,
  text: string,
  ulongMax: number,
  longMax: number,
  uintMax: number,
  intMax: number,
  isLong?: boolean,
  isUnsigned?: boolean,
): Token {
  let type: Integer = "int";
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

function parseEscape(char: string) {
  let value = 0;
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
      value = 0;
      for (let i = 1; i < char.length; i++) {
        value <<= 3;
        value += char.charCodeAt(i) - 48;
      }
      break;
    case 88 /* X */:
    case 120 /* x */:
      value = 0;
      for (let i = 2; i < char.length; i++) {
        value <<= 4;
        const c = char.charCodeAt(i);
        if (c >= 48 /* 0 */ && c <= 57 /* 9 */) {
          value += c - 48;
        } else if (c >= 65 /* A */ && c <= 70 /* F */) {
          value += c - 65 + 10;
        } else {
          value += c - 97 + 10;
        }
      }
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
      break;
  }
  return value;
}
