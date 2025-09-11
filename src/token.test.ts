import assert from "node:assert";
import test from "node:test";

import {
  keywords,
  operators,
  punctuators,
  type Token,
  tokenize,
} from "./token.ts";

function assertTokens(input: string, ...expectedTokens: Token[]) {
  let i = 0;
  let output = "";
  for (const actual of tokenize(input)) {
    const expected = expectedTokens[i++];
    output += actual.text;

    if (expected === undefined) {
      if (actual.type === "eof") {
        break;
      }
      assert.fail(`${input}: Unexpected extra token ${JSON.stringify(actual)}`);
    }

    assert.deepEqual(
      actual,
      expected,
      `${input}: Expected token ${i - 1} to be ${JSON.stringify(expected)}, got ${JSON.stringify(actual)}`
    );
  }
  assert.equal(
    output,
    input,
    `Expected input to equal output.`
  );
}

test("tokenize should parse whitespace", () => {
  assertTokens(`   \t\n\r`, { type: "eof", text: `   \t\n\r` });
  assertTokens(`/* comment */`, { type: "eof", text: `/* comment */` });
  assertTokens(`   /* comment */ \n\t `, {
    type: "eof",
    text: `   /* comment */ \n\t `,
  });
});

test("tokenize should parse keywords", () => {
  for (const keyword of keywords) {
    assertTokens(keyword, { type: keyword, text: keyword });
  }
});

test("tokenize should parse identifiers", () => {
  assertTokens(`a`, { type: "id", value: `a`, text: `a` });
  assertTokens(`_a`, { type: "id", value: `_a`, text: `_a` });
  assertTokens(`_a12`, { type: "id", value: `_a12`, text: `_a12` });
});

test("tokenize should parse floating-point numbers", () => {
  assertTokens(`1.3`, { type: "double", value: 1.3, text: `1.3` });
  assertTokens(`1.e2`, { type: "double", value: 1e2, text: `1.e2` });
  assertTokens(`1e+2`, { type: "double", value: 1e2, text: `1e+2` });
  assertTokens(`1e-2`, { type: "double", value: 1e-2, text: `1e-2` });
  assertTokens(`1.f`, { type: "float", value: 1, text: `1.f` });
  assertTokens(`1.l`, { type: "long double", value: 1, text: `1.l` });
});

test("tokenize should parse integer numbers", () => {
  assertTokens(`12345`, { type: "int", value: 12345, text: `12345` });
  assertTokens(`12345u`, {
    type: "unsigned int",
    value: 12345,
    text: `12345u`,
  });
  assertTokens(`12345L`, { type: "long int", value: 12345, text: `12345L` });
  assertTokens(`01234`, { type: "int", value: 668, text: `01234` });
  assertTokens(`0xCAFE`, {
    type: "unsigned int",
    value: 51966,
    text: `0xCAFE`,
  });
  assertTokens(`65535`, { type: "unsigned int", value: 65535, text: `65535` });
  assertTokens(`2147483647`, {
    type: "long int",
    value: 2147483647,
    text: `2147483647`,
  });
  assertTokens(`4294967295`, {
    type: "unsigned long int",
    value: 4294967295,
    text: `4294967295`,
  });
});

test("tokenize should parse character constants", () => {
  assertTokens(`'a'`, { type: "char", value: 97, text: `'a'` });
  assertTokens(`L'a'`, { type: "wchar", value: 97, text: `L'a'` });
  assertTokens(`'\\0'`, { type: "char", value: 0, text: `'\\0'` });
  assertTokens(`'\\\\'`, { type: "char", value: 92, text: `'\\\\'` });
});

test("tokenize should parse string constants", () => {
  assertTokens(`""`, { type: "string", value: ``, text: `""` });
  assertTokens(`"a"`, { type: "string", value: `a`, text: `"a"` });
  assertTokens(`L"a"`, { type: "wstring", value: `a`, text: `L"a"` });
  assertTokens(`"\\0"`, { type: "string", value: `\0`, text: `"\\0"` });
  assertTokens(`"\\\\"`, { type: "string", value: `\\`, text: `"\\\\"` });
});

test("tokenize should parse punctuators", () => {
  for (const punctuator of punctuators) {
    assertTokens(punctuator, { type: punctuator, text: punctuator });
  }
});

test("tokenize should parse operators", () => {
  for (const operator of operators) {
    assertTokens(operator, { type: operator, text: operator });
  }
});

test("tokenize should parse a whole source file", () => {
  const input = `
int printf(const char *fmt, ...);

int main(int argv, const char **argc) {
  int i;

  /* Start at one to skip program name */
  for (i = 1; i < argv; i++) {
    printf("%s\\n", argc[i]);
  }

  return 0;
}
`;

  assertTokens(
    input,
    { type: "int", text: "\nint" },
    { type: "id", value: "printf", text: " printf" },
    { type: "(", text: "(" },
    { type: "const", text: "const" },
    { type: "char", text: " char" },
    { type: "*", text: " *" },
    { type: "id", value: "fmt", text: "fmt" },
    { type: ",", text: "," },
    { type: "...", text: " ..." },
    { type: ")", text: ")" },
    { type: ";", text: ";" },
    { type: "int", text: "\n\nint" },
    { type: "id", value: "main", text: " main" },
    { type: "(", text: "(" },
    { type: "int", text: "int" },
    { type: "id", value: "argv", text: " argv" },
    { type: ",", text: "," },
    { type: "const", text: " const" },
    { type: "char", text: " char" },
    { type: "*", text: " *" },
    { type: "*", text: "*" },
    { type: "id", value: "argc", text: "argc" },
    { type: ")", text: ")" },
    { type: "{", text: " {" },
    { type: "int", text: "\n  int" },
    { type: "id", value: "i", text: " i" },
    { type: ";", text: ";" },
    {
      type: "for",
      text: "\n\n  /* Start at one to skip program name */\n  for",
    },
    { type: "(", text: " (" },
    { type: "id", value: "i", text: "i" },
    { type: "=", text: " =" },
    { type: "int", value: 1, text: " 1" },
    { type: ";", text: ";" },
    { type: "id", value: "i", text: " i" },
    { type: "<", text: " <" },
    { type: "id", value: "argv", text: " argv" },
    { type: ";", text: ";" },
    { type: "id", value: "i", text: " i" },
    { type: "++", text: "++" },
    { type: ")", text: ")" },
    { type: "{", text: " {" },
    { type: "id", value: "printf", text: "\n    printf" },
    { type: "(", text: "(" },
    { type: "string", value: "%s\n", text: '"%s\\n"' },
    { type: ",", text: "," },
    { type: "id", value: "argc", text: " argc" },
    { type: "[", text: "[" },
    { type: "id", value: "i", text: "i" },
    { type: "]", text: "]" },
    { type: ")", text: ")" },
    { type: ";", text: ";" },
    { type: "}", text: "\n  }" },
    { type: "return", text: "\n\n  return" },
    { type: "int", value: 0, text: " 0" },
    { type: ";", text: ";" },
    { type: "}", text: "\n}" },
    { type: "eof", text: "\n" }
  );
});

test("tokenize should reject invalid input", () => {
  assertTokens(`"unterminated`, { type: "error", text: `"unterminated` });
  assertTokens(`'a`, { type: "error", text: `'a` });
  assertTokens(
    `int main() { @ }`,
    { type: "int", text: "int" },
    { type: "id", value: "main", text: " main" },
    { type: "(", text: "(" },
    { type: ")", text: ")" },
    { type: "{", text: " {" },
    { type: "error", text: " @ }" }
  );
});
