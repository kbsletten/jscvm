import assert from "node:assert";
import test from "node:test";

import { preprocess } from "./preprocessor.ts";

function lines(...lines: string[]) {
  return lines.join("\n") + "\n";
}

test("preprocessor passes through standard lines", () => {
  const multilineText = lines("a", "b\r", "c");

  assert.equal(preprocess(multilineText), multilineText);
});

test("preprocessor handles #ifdef", () => {
  const input = lines("#define A", "#ifdef A", "a", "#endif");

  assert.equal(preprocess(input), lines("a"));
});

test("preprocessor handles #ifndef", () => {
  const input = lines("#define A", "#ifndef A", "a", "#endif");

  assert.equal(preprocess(input), "");
});

test("preprocessor handles nested #ifdef and #ifndef", () => {
  const input = lines(
    "#define A",
    "#ifdef A",
    "a",
    "#ifndef B",
    "not b",
    "#else",
    "b",
    "#endif",
    "#else",
    "not a",
    "#endif",
  );
  assert.equal(preprocess(input), lines("a", "not b"));
});

test("preprocessor does not run inactive branches", () => {
  const input = lines(
    "#ifdef A",
    "#define B",
    "#endif",
    "#ifdef B",
    "b",
    "#endif",
  );
  assert.equal(preprocess(input), "");
});

test("preprocessor handles #undef", () => {
  const input = lines(
    "#define A",
    "#ifdef A",
    "a",
    "#undef A",
    "#endif",
    "#ifdef A",
    "not a",
    "#endif",
  );
  assert.equal(preprocess(input), lines("a"));
});

test("preprocessor ignores #pragmas", () => {
  const input = lines("#pragma once", "a");

  assert.equal(preprocess(input), lines("a"));
});

test("preprocessor performs macro replacement", () => {
  const input = lines("#define A a", "#define B b", "A", "B", "C");
  assert.equal(preprocess(input), lines("a", "b", "C"));
});

test("preprocessor handles recursive macro replacement", () => {
  const input = lines(
    "#define A B",
    "#define B C",
    "#define C D",
    "A",
    "B",
    "C",
  );
  assert.equal(preprocess(input), lines("D", "D", "D"));
});

test("preprocessor handles parameterized macros", () => {
  const input = lines("#define A(x) x x", "A(a)", "A(b)");
  assert.equal(preprocess(input), lines("a a", "b b"));
});

test("preprocessor handles nested parameterized macros", () => {
  const input = lines(
    "#define A(x) x x",
    "#define B(y) A(y) A(y)",
    "B(a)",
    "B(b)",
  );
  assert.equal(preprocess(input), lines("a a a a", "b b b b"));
});

test("preprocessor handles parameterized macros with multiple parameters", () => {
  const input = lines("#define A(x, y) x y", "A(a, b)", "A(b, a)");
  assert.equal(preprocess(input), lines("a b", "b a"));
});

test("preprocessor handles parenthesis in parameterized macros", () => {
  const input = lines("#define A(x) (x)", "A(a + b)", "A((a + b) * c)");
  assert.equal(preprocess(input), lines("(a + b)", "((a + b) * c)"));
});

test("preprocessor handles stringizing", () => {
  const input = lines("#define A(x) #1 #x", "A(a)", "A(b a d)");
  assert.equal(preprocess(input), lines('"1" "a"', '"1" "b a d"'));
});
