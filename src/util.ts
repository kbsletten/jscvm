const terminal = Symbol("terminal");
interface TokenTrie {
  [terminal]?: true;
  [key: string]: TokenTrie;
}

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

export function optimizeRegex(...tokens: string[]) {
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
}

export class Lookahead<T> {
  private consumed: boolean = false;
  private current: IteratorResult<T, undefined>;
  private iterator: Iterator<T, undefined>;
  constructor(iterable: Iterable<T, undefined>) {
    this.iterator = iterable[Symbol.iterator]();
    this.current = this.iterator.next(undefined);
  }

  peek(): T | undefined {
    if (this.consumed) {
      this.consumed = false;
      this.current = this.iterator.next(undefined);
    }
    return this.current.value;
  }

  advance(): T | undefined {
    if (!this.consumed) {
      this.consumed = true;
      return this.current.value;
    }
    return (this.current = this.iterator.next(undefined)).value;
  }

  [Symbol.dispose]() {
    this.iterator.return?.(undefined);
  }
}

export class Context<K, V> extends Map<K, V> {
  private parent?: Context<K, V>;
  constructor(parent?: Context<K, V>) {
    super();
    this.parent = parent;
  }

  override has(key: K): boolean {
    if (super.has(key)) {
      return true;
    }
    if (this.parent !== undefined) {
      return this.parent.has(key);
    }
    return false;
  }

  override get(key: K): V | undefined {
    if (super.has(key)) {
      return super.get(key);
    }
    if (this.parent !== undefined) {
      return this.parent.get(key);
    }
    return undefined;
  }
}
