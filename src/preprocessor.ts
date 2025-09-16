import { Context, Lookahead, optimizeRegex } from "./util.ts";

const tokenRegex = new RegExp(
  [
    /* ctrl */ `^#(?:${optimizeRegex("if", "ifdef", "ifndef", "elif", "else", "endif", "include", "define", "undef", "error", "pragma")})\\b`,
    /* op */ `${optimizeRegex("(", ")", ",", "##", "#", "+", "-", "*", "/", "%", "&&", "&", "||", "|", "^", "~", "!=", "!", "==", "<<", "<", ">>", ">", "?", ":")}`,
    /* id */ `[A-Za-z_][A-Za-z0-9_]*`,
    /* nl */ `\\n`,
    /* ws */ `[ \\t\\r]+`,
    /* txt */ `(?:\\\\(?:.|\\n)|[^ \\n\\t\\r(),#+\\-*/%&|^~!=<>?:A-Za-z_])+`,
  ].join("|"),
  "gm",
);

const isDef = new RegExp(
  `^#${optimizeRegex("ifdef", "ifndef", "define", "undef")}$`,
);
const isId = /^[A-Za-z_]/;
const isWhitespace = /^[ \t\r]+$/;

type Macro = [string[], string[]];

function stringize(str: string[]): string {
  return `"${str.join("").replace(/\\/g, "\\\\").replace(/"/g, '\\"')}"`;
}

function* expand(
  src: Iterable<string, undefined>,
  symbols: Context<string, Macro>,
): Generator<string, undefined> {
  interface Ctx {
    tokens: Lookahead<string>;
    symbols: Context<string, Macro>;
    stringizing?: string[];
  }
  const stack: Ctx[] = [];
  let ctx: Ctx | undefined = {
    tokens: new Lookahead<string>(src),
    symbols,
  };
  try {
    while (ctx !== undefined) {
      for (
        let tok = ctx.tokens.advance();
        tok !== undefined;
        tok = ctx.tokens.advance()
      ) {
        if (
          ctx.stringizing !== undefined &&
          tok !== "#" &&
          tok !== "##" &&
          tok.startsWith("#")
        ) {
          throw new Error("Cannot process directives while stringizing");
        }
        if (isDef.test(tok)) {
          yield tok;
          while (tok !== "\n") {
            tok = ctx.tokens.advance();
            if (tok === undefined) break;
            yield tok;
          }
        } else if (isId.test(tok)) {
          if (ctx.symbols.has(tok)) {
            const name = tok;
            const macro: Macro | undefined = ctx.symbols.get(tok);
            if (macro !== undefined) {
              const parameters = macro[0];
              const replacement: string[] = macro[1];
              let tbl: Context<string, Macro> = ctx.symbols;
              stack.push(ctx);
              if (parameters.length > 0) {
                tbl = new Context(ctx.symbols);
                let index = 0;
                tok = ctx.tokens.advance();
                if (tok !== "(") {
                  throw new Error(`Macro ${name} requires parameters`);
                }
                tok = ctx.tokens.advance();
                while (tok !== undefined && tok !== ")") {
                  if (isWhitespace.test(tok)) {
                    tok = ctx.tokens.advance();
                    continue;
                  }
                  if (index >= parameters.length) {
                    throw new Error(`Too many arguments for macro ${name}`);
                  }
                  const arg = parameters[index++];
                  const def = [];
                  let parenDepth = 0;
                  while (
                    tok !== undefined &&
                    (parenDepth > 0 || (tok !== "," && tok !== ")"))
                  ) {
                    if (tok === "(") {
                      parenDepth++;
                    } else if (tok === ")") {
                      parenDepth--;
                    }
                    def.push(tok);
                    tok = ctx.tokens.advance();
                  }
                  tbl.set(arg, [[], def]);
                  if (tok === ",") {
                    tok = ctx.tokens.advance();
                  }
                }
                if (tok !== ")") {
                  throw new Error(`Unterminated macro call for ${name}`);
                }
                if (index < parameters.length) {
                  throw new Error(`Too few arguments for macro ${name}`);
                }
              }
              ctx = {
                tokens: new Lookahead<string>(replacement),
                symbols: tbl,
              };
            }
          } else if (ctx.stringizing !== undefined) {
            ctx.stringizing.push(tok);
          } else {
            yield tok;
          }
        } else if (tok === "#") {
          tok = ctx.tokens.advance();

          if (tok === undefined || !isId.test(tok)) {
            throw new Error(`Unexpected token after #: ${tok}`);
          }

          if (!ctx.symbols.has(tok, false)) {
            throw new Error(`Cannot stringize ${tok}`);
          }

          const macro: Macro | undefined = ctx.symbols.get(tok, false);

          if (macro === undefined || macro[0].length > 0) {
            throw new Error(`Cannot stringize ${tok}`);
          }

          const replacement: string[] = macro[1];
          let tbl: Context<string, Macro> = ctx.symbols;
          stack.push(ctx);

          ctx = {
            tokens: new Lookahead<string>(replacement),
            symbols: tbl,
            stringizing: [],
          };
        } else if (ctx.stringizing !== undefined) {
          ctx.stringizing.push(tok);
        } else {
          yield tok;
        }
      }
      if (ctx?.stringizing !== undefined) {
        yield stringize(ctx.stringizing);
        ctx.stringizing = undefined;
      }
      ctx.tokens[Symbol.dispose]();
      ctx = stack.pop();
    }
  } finally {
    while (ctx !== undefined) {
      ctx.tokens[Symbol.dispose]();
      ctx = stack.pop();
    }
  }
}

export function preprocess(input: string): string {
  const branches: boolean[] = [];
  const output: string[] = [];
  const symbols = new Context<string, Macro>();
  const tokens = new Lookahead<string>(
    expand(
      input.matchAll(tokenRegex).map((m) => m?.[0]),
      symbols,
    ),
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
            `Unexpected token in #ifdef ${tok}, expected whitespace`,
          );
        }
        tok = tokens.advance();
        if (tok === undefined || !isId.test(tok)) {
          throw new Error(
            `Unexpected token in #ifdef ${tok}, expected identifier`,
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
            `Unexpected token in #ifdef ${tok}, expected newline`,
          );
        }
      } else if (tok === "#ifndef") {
        tok = tokens.advance();
        if (tok === undefined || !isWhitespace.test(tok)) {
          throw new Error(
            `Unexpected token in #ifndef ${tok}, expected whitespace`,
          );
        }
        tok = tokens.advance();
        if (tok === undefined || !isId.test(tok)) {
          throw new Error(
            `Unexpected token in #ifndef ${tok}, expected identifier`,
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
            `Unexpected token in #ifndef ${tok}, expected newline`,
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
            `Unexpected token in #endif ${tok}, expected newline`,
          );
        }
      } else if (tok === "#include") {
        throw new Error("Not implemented!");
      } else if (tok === "#define") {
        tok = tokens.advance();
        if (tok === undefined || !isWhitespace.test(tok)) {
          throw new Error(
            `Unexpected token in #define ${tok}, expected whitespace`,
          );
        }
        const id = tokens.advance();
        if (id === undefined || !isId.test(id)) {
          throw new Error(
            `Unexpected token in #define ${id}, expected identifier`,
          );
        }
        if (isActive) {
          const params = [];
          tok = tokens.advance();
          if (tok === "(") {
            tok = tokens.advance();
            while (tok !== undefined && tok !== ")") {
              if (isWhitespace.test(tok)) {
                tok = tokens.advance();
                if (tok === undefined) {
                  throw new Error(
                    `Unexpected end of input in #define parameters`,
                  );
                }
              }
              if (!isId.test(tok)) {
                throw new Error(
                  `Unexpected token in #define parameters ${tok}, expected identifier`,
                );
              }
              params.push(tok);
              tok = tokens.advance();
              if (tok !== undefined && isWhitespace.test(tok)) {
                tok = tokens.advance();
              }
              if (tok === ",") {
                tok = tokens.advance();
              } else if (tok !== ")") {
                throw new Error(
                  `Unexpected token in #define parameters ${tok}, expected , or )`,
                );
              }
            }
            tok = tokens.advance();
          }
          const def = [];
          if (tok !== undefined && isWhitespace.test(tok)) {
            tok = tokens.advance();
          }
          while (tok !== undefined && tok !== "\n") {
            def.push(tok);
            tok = tokens.advance();
          }
          symbols.set(id, [params, def]);
        } else {
          while (tok !== undefined && tok !== "\n") {
            tok = tokens.advance();
          }
        }
      } else if (tok === "#undef") {
        tok = tokens.advance();
        if (tok === undefined || !isWhitespace.test(tok)) {
          throw new Error(
            `Unexpected token in #undef ${tok}, expected whitespace`,
          );
        }
        tok = tokens.advance();
        if (tok === undefined || !isId.test(tok)) {
          throw new Error(
            `Unexpected token in #undef ${tok}, expected identifier`,
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
            `Unexpected token in #undef ${tok}, expected newline`,
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
