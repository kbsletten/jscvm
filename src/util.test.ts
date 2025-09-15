import assert from "node:assert";
import test from "node:test";

import { Lookahead, optimizeRegex } from "./util.ts";

test("optimizeRegex should optimize regex patterns", () => {
  assert.equal(optimizeRegex("a", "b", "c"), "a|b|c");
  assert.equal(optimizeRegex("ab", "ac", "ad"), "a(?:b|c|d)");
  assert.equal(optimizeRegex("a", "ab", "ac", "ade"), "a(?:b|c|de)?");
});

test("lookahead should peek and advance", () => {
  const lookahead = new Lookahead([1, 2, 3]);
  try {
    assert.equal(lookahead.peek(), 1);
    assert.equal(lookahead.peek(), 1);
    assert.equal(lookahead.advance(), 1);
    assert.equal(lookahead.peek(), 2);
    assert.equal(lookahead.advance(), 2);
    assert.equal(lookahead.peek(), 3);
    assert.equal(lookahead.advance(), 3);
    assert.equal(lookahead.peek(), undefined);
    assert.equal(lookahead.advance(), undefined);
  } finally {
    lookahead[Symbol.dispose]();
  }
});
