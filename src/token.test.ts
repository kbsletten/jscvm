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
  for (const actual of tokenize(input)) {
    const expected = expectedTokens[i++];
    assert.deepEqual(
      actual,
      expected,
      `${input}: Expected token ${i - 1} to be ${JSON.stringify(expected)}, got ${JSON.stringify(actual)}`
    );
  }
  assert.equal(
    i,
    expectedTokens.length,
    `${input}: Expected ${expectedTokens.length} tokens, got ${i}`
  );
}

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
  assertTokens(`0xCAFE`, { type: "unsigned int", value: 51966, text: `0xCAFE` });
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
