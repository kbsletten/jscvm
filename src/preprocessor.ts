const preprocessorLines = new RegExp(
  [
    /* _if */ `^#if\\s+(.+)\\r?\\n`,
    /* ifd */ `^#ifdef\\s+(.+)\\r?\\n`,
    /* ifnd */ `^#ifndef\\s+(.+)\\r?\\n`,
    /* elif */ `^#elif\\s+(.+)\\r?\\n`,
    /* ! _else */ `^#else\\s*\\r?\\n`,
    /* ! end */ `^#endif\\s*\\r?\\n`,
    /* inc */ `^#include\\s+(<[^>]+>|"[^"]+")\\r?\\n`,
    /* id, args, def */ `^#define\\s+([A-Za-z_][A-Za-z0-9_]*)(?:\\(([^)]*)\\))?(.*)\\r?\\n`,
    /* und */ `^#undef\\s+([A-Za-z_][A-Za-z0-9]*)\\s*\\r?\\n`,
    /* err */ `^#error\\s+(.*)\\r?\\n`,
    /* prg */ `^#pragma\\s+(.*)\\r?\\n`,
    `^.*\\r?\\n`,
  ].join("|"),
  "gm"
);

export function preprocess(input: string): string {
  const state: {
    branches: Boolean[];
    output: string[];
    symbols: Map<string, string | undefined>;
  } = {
    branches: [],
    output: [],
    symbols: new Map<string, string | undefined>(),
  };
  for (const line of input.matchAll(preprocessorLines)) {
    const text = line[0];
    const _if = line[1];
    const ifd = line[2];
    const ifnd = line[3];
    const elif = line[4];
    const _else = text.startsWith("#else") ? text : undefined;
    const end = text.startsWith("#endif") ? text : undefined;
    const inc = line[5];
    const id = line[6];
    const args = line[7];
    const def = line[8];
    const und = line[9];
    const err = line[10];
    const prg = line[11];

    const isActive = state.branches.every((b) => b);

    if (_if !== undefined) {
      throw new Error("Not implenmented!");
    } else if (ifd !== undefined) {
      if (state.symbols.has(ifd)) {
        state.branches.push(true);
      } else {
        state.branches.push(false);
      }
    } else if (ifnd !== undefined) {
      if (state.symbols.has(ifnd)) {
        state.branches.push(false);
      } else {
        state.branches.push(isActive && true);
      }
    } else if (elif !== undefined) {
      throw new Error("Not implemented!");
    } else if (_else !== undefined) {
      const branch = state.branches.pop();
      state.branches.push(!branch);
    } else if (end !== undefined) {
      state.branches.pop();
    } else if (inc !== undefined) {
      throw new Error("Not implemented!");
    } else if (id !== undefined) {
      if (args !== undefined) {
        throw new Error("Not implemented!");
      }
      if (isActive) {
        state.symbols.set(id, def);
      }
    } else if (und !== undefined) {
      if (isActive) {
        state.symbols.delete(und);
      }
    } else if (err) {
      if (isActive) {
        throw new Error(`Encountered #error ${err}`);
      }
    } else if (prg) {
      // no pragma support yet
    } else {
      if (isActive) {
        state.output.push(text);
      }
    }
  }
  return state.output.join("");
}
