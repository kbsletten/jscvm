import assert from "node:assert";
import test from "node:test";

import { keywords, operators, tokenize } from "./token.ts";

function assertTokens(input, ...tokens) {
  let i = 0;
  for (const token of tokenize(input)) {
    assert.deepEqual(token, tokens[i++]);
  }
  assert.equal(i, tokens.length);
}

test("tokens regex should parse keywords", () => {
  for (const keyword of keywords) {
    assertTokens(keyword, { type: keyword });
  }
});

test("tokens regex should parse identifiers", () => {
  assertTokens(`a`, { type: "id", value: `a`, text: `a` });
  assertTokens(`_a`, { type: "id", value: `_a`, text: `_a` });
  assertTokens(`_a12`, { type: "id", value: `_a12`, text: `_a12` });
});

test("tokens regex should parse floating-point numbers", () => {
  assertTokens(`1.3`, { type: "float", value: 1.3, text: `1.3` });
  assertTokens(`1.e2`, { type: "float", value: 1e2, text: `1.e2` });
  assertTokens(`1e+2`, { type: "float", value: 1e2, text: `1e+2` });
  assertTokens(`1e-2`, { type: "float", value: 1e-2, text: `1e-2` });
  assertTokens(`1.f`, { type: "float", value: 1, text: `1.f` });
});

test("tokens regex should parse integer numbers", () => {
  assertTokens(`12345`, { type: "int", value: 12345, text: `12345` });
  assertTokens(`12345u`, { type: "int", value: 12345, text: `12345u` });
  assertTokens(`12345L`, { type: "int", value: 12345, text: `12345L` });
  assertTokens(`01234`, { type: "int", value: 668, text: `01234` });
  assertTokens(`0xCAFE`, { type: "int", value: 51966, text: `0xCAFE` });
});

test("tokens regex should parse character constants", () => {
  assertTokens(`'a'`, { type: "char", value: `a`, text: `'a'` });
  assertTokens(`L'a'`, { type: "char", value: `a`, text: `L'a'` });
  assertTokens(`'\\0'`, { type: "char", value: `\0'`, text: `'\\0'` });
  assertTokens(`'\\\\'`, { type: "char", value: `\\`, text: `'\\\\'` });
});

test("tokens regex should parse string constants", () => {
  assertTokens(`""`, { type: "string", value: ``, text: `""` });
  assertTokens(`"a"`, { type: "string", value: `a`, text: `"a"` });
  assertTokens(`L"a"`, { type: "string", value: `a`, text: `L"a"` });
  assertTokens(`"\\0"`, { type: "string", value: `\0`, text: `"\\0"` });
  assertTokens(`"\\\\"`, { type: "string", value: `\\`, text: `"\\\\"` });
});

test("tokens regex should parse operators", () => {
  for (const operator of operators) {
    assertTokens(operator, { type: operator });
  }
});
