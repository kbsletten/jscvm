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
    "#endif"
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
    "#endif"
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
    "#endif"
  );
  assert.equal(preprocess(input), lines("a"));
});

test("preprocessor ignores #pragmas", () => {
  const input = lines("#pragma once", "a");

  assert.equal(preprocess(input), lines("a"));
});
