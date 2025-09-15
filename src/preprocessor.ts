import { Lookahead, optimizeRegex } from "./util.ts";

const tokenRegex = new RegExp(
  [
    /* ctrl */ `^#(?:${optimizeRegex("if", "ifdef", "ifndef", "elif", "else", "endif", "include", "define", "undef", "error", "pragma")})\\b`,
    /* op */ `${optimizeRegex("(", ")", ",", "##", "#", "+", "-", "*", "/", "%", "&&", "&", "||", "|", "^", "~", "!=", "!", "==", "<<", "<", ">>", ">", "?", ":")}`,
    /* id */ `[A-Za-z_][A-Za-z0-9_]*`,
    /* nl */ `\\n`,
    /* txt */ `(?:\\\\(?:.|\\n)|[^\\n(),A-Za-z_])+`,
  ].join("|"),
  "gm"
);

const isDef = new RegExp(
  `^#${optimizeRegex("ifdef", "ifndef", "define", "undef")}$`
);
const isId = /^[A-Za-z_]/;
const isWhitespace = /^[ \t\r]+$/;

function* expand(
  src: Iterable<string, undefined>,
  table: Map<string, string[] | undefined>
): Generator<string, undefined> {
  const stack: Lookahead<string>[] = [];
  let cur: Lookahead<string> | undefined = new Lookahead<string>(src);
  try {
    while (cur !== undefined) {
      for (let tok = cur.advance(); tok !== undefined; tok = cur.advance()) {
        if (isDef.test(tok)) {
          yield tok;
          tok = cur.advance();
          if (tok === undefined) continue;
          yield tok;
          if (isWhitespace.test(tok)) {
            tok = cur.advance();
            if (tok === undefined) continue;
            yield tok;
          }
        } else if (isId.test(tok)) {
          if (table.has(tok)) {
            const replacement = table.get(tok);
            if (replacement !== undefined) {
              stack.push(cur);
              cur = new Lookahead<string>(replacement);
            }
          } else {
            yield tok;
          }
        } else {
          yield tok;
        }
      }
      cur[Symbol.dispose]();
      cur = stack.pop();
    }
  } finally {
    while (cur !== undefined) {
      cur[Symbol.dispose]();
      cur = stack.pop();
    }
  }
}

export function preprocess(input: string): string {
  const branches: boolean[] = [];
  const output: string[] = [];
  const symbols = new Map<string, string[]>();
  const tokens = new Lookahead<string>(
    expand(
      input.matchAll(tokenRegex).map((m) => m?.[0]),
      symbols
    )
  );
  for (let tok = tokens.advance(); tok !== undefined; tok = tokens.advance()) {
    const isActive = branches.every((b) => b);
    if (tok.startsWith("#")) {
      if (tok === "#if") {
        throw new Error("Not implenmented!");
      } else if (tok === "#ifdef") {
        tok = tokens.advance();
        if (tok === undefined || !isWhitespace.test(tok)) {
          throw new Error(
            `Unexpected token in #ifdef ${tok}, expected whitespace`
          );
        }
        tok = tokens.advance();
        if (tok === undefined || !isId.test(tok)) {
          throw new Error(
            `Unexpected token in #ifdef ${tok}, expected identifier`
          );
        }
        if (symbols.has(tok)) {
          branches.push(true);
        } else {
          branches.push(false);
        }
        tok = tokens.advance();
        if (tok !== undefined && isWhitespace.test(tok)) {
          tok = tokens.advance();
        }
        if (tok !== "\n") {
          throw new Error(
            `Unexpected token in #ifdef ${tok}, expected newline`
          );
        }
      } else if (tok === "#ifndef") {
        tok = tokens.advance();
        if (tok === undefined || !isWhitespace.test(tok)) {
          throw new Error(
            `Unexpected token in #ifndef ${tok}, expected whitespace`
          );
        }
        tok = tokens.advance();
        if (tok === undefined || !isId.test(tok)) {
          throw new Error(
            `Unexpected token in #ifndef ${tok}, expected identifier`
          );
        }
        if (symbols.has(tok)) {
          branches.push(false);
        } else {
          branches.push(isActive && true);
        }
        tok = tokens.advance();
        if (tok !== undefined && isWhitespace.test(tok)) {
          tok = tokens.advance();
        }
        if (tok !== "\n") {
          throw new Error(
            `Unexpected token in #ifndef ${tok}, expected newline`
          );
        }
      } else if (tok === "#elif") {
        throw new Error("Not implemented!");
      } else if (tok === "#else") {
        const branch = branches.pop();
        branches.push(!branch);
        tok = tokens.advance();
        if (tok !== undefined && isWhitespace.test(tok)) {
          tok = tokens.advance();
        }
        if (tok !== "\n") {
          throw new Error(`Unexpected token in #else ${tok}, expected newline`);
        }
      } else if (tok === "#endif") {
        branches.pop();
        tok = tokens.advance();
        if (tok !== undefined && isWhitespace.test(tok)) {
          tok = tokens.advance();
        }
        if (tok !== "\n") {
          throw new Error(
            `Unexpected token in #endif ${tok}, expected newline`
          );
        }
      } else if (tok === "#include") {
        throw new Error("Not implemented!");
      } else if (tok === "#define") {
        tok = tokens.advance();
        if (tok === undefined || !isWhitespace.test(tok)) {
          throw new Error(
            `Unexpected token in #define ${tok}, expected whitespace`
          );
        }
        const id = tokens.advance();
        if (id === undefined || !isId.test(id)) {
          throw new Error(
            `Unexpected token in #define ${id}, expected identifier`
          );
        }
        if (isActive) {
          const def = [];
          tok = tokens.advance();
          while (tok !== undefined && tok !== "\n") {
            def.push(tok);
            tok = tokens.advance();
          }
          symbols.set(id, def);
        } else {
          while (tok !== undefined && tok !== "\n") {
            tok = tokens.advance();
          }
        }
      } else if (tok === "#undef") {
        tok = tokens.advance();
        if (tok === undefined || !isWhitespace.test(tok)) {
          throw new Error(
            `Unexpected token in #undef ${tok}, expected whitespace`
          );
        }
        tok = tokens.advance();
        if (tok === undefined || !isId.test(tok)) {
          throw new Error(
            `Unexpected token in #undef ${tok}, expected identifier`
          );
        }
        if (isActive) {
          symbols.delete(tok);
        }
        tok = tokens.advance();
        if (tok !== undefined && isWhitespace.test(tok)) {
          tok = tokens.advance();
        }
        if (tok !== "\n") {
          throw new Error(
            `Unexpected token in #undef ${tok}, expected newline`
          );
        }
      } else if (tok === "#error") {
        tok = tokens.advance();
        if (isActive) {
          const err = [];
          while (tok !== undefined && tok !== "\n") {
            err.push(tok);
            tok = tokens.advance();
          }
          throw new Error(`Encountered #error ${err.join("")}`);
        } else {
          while (tok !== undefined && tok !== "\n") {
            tok = tokens.advance();
          }
        }
      } else if (tok === "#pragma") {
        // TODO: implement pragmas
        tok = tokens.advance();
        while (tok !== undefined && tok !== "\n") {
          tok = tokens.advance();
        }
      } else {
        throw new Error(`Unknown preprocessor directive ${tok}`);
      }
    } else {
      if (isActive) {
        output.push(tok);
      }
      while (tok !== undefined && tok !== "\n") {
        tok = tokens.advance();
        if (isActive && tok !== undefined) {
          output.push(tok);
        }
      }
    }
  }
  return output.join("");
}
