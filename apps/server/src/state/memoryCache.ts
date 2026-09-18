/**
 * Process-local stand-in for the Redis commands this engine uses.
 *
 * Render Hobby workspaces allow one free Key Value instance. If that slot is
 * already taken, the API still has to boot — and free Key Value does not
 * persist across restarts anyway, so in-memory matches the free-tier contract
 * on a single web instance.
 */

type Scalar = { kind: "string"; value: string };
type List = { kind: "list"; value: string[] };
type HashSet = { kind: "set"; value: Set<string> };
type Hll = { kind: "hll"; value: Set<string> };
type Counter = { kind: "int"; value: number };
type Record = (Scalar | List | HashSet | Hll | Counter) & { expiresAt?: number };

function now(): number {
  return Date.now();
}

function alive(record: Record | undefined): record is Record {
  return Boolean(record && (record.expiresAt === undefined || record.expiresAt > now()));
}

function sliceList(items: string[], start: number, stop: number): string[] {
  const len = items.length;
  let from = start < 0 ? len + start : start;
  let to = stop < 0 ? len + stop : stop;
  from = Math.max(0, from);
  to = Math.min(len - 1, to);
  if (from > to || len === 0) return [];
  return items.slice(from, to + 1);
}

export class MemoryCache {
  private readonly store = new Map<string, Record>();

  private read(key: string): Record | undefined {
    const record = this.store.get(key);
    if (!alive(record)) {
      this.store.delete(key);
      return undefined;
    }
    return record;
  }

  ping(): Promise<"PONG"> {
    return Promise.resolve("PONG");
  }

  quit(): Promise<"OK"> {
    this.store.clear();
    return Promise.resolve("OK");
  }

  async get(key: string): Promise<string | null> {
    const record = this.read(key);
    if (!record) return null;
    if (record.kind === "string") return record.value;
    if (record.kind === "int") return String(record.value);
    return null;
  }

  async set(
    key: string,
    value: string,
    mode?: "EX",
    ttlSeconds?: number,
  ): Promise<"OK"> {
    const record: Record = { kind: "string", value };
    if (mode === "EX" && ttlSeconds && ttlSeconds > 0) {
      record.expiresAt = now() + ttlSeconds * 1000;
    }
    this.store.set(key, record);
    return "OK";
  }

  async getdel(key: string): Promise<string | null> {
    const value = await this.get(key);
    this.store.delete(key);
    return value;
  }

  async del(...keys: string[]): Promise<number> {
    let removed = 0;
    for (const key of keys) {
      if (this.store.delete(key)) removed += 1;
    }
    return removed;
  }

  async expire(key: string, ttlSeconds: number): Promise<number> {
    const record = this.read(key);
    if (!record) return 0;
    record.expiresAt = now() + ttlSeconds * 1000;
    this.store.set(key, record);
    return 1;
  }

  async incr(key: string): Promise<number> {
    const record = this.read(key);
    const next = record?.kind === "int" ? record.value + 1 : 1;
    this.store.set(key, {
      kind: "int",
      value: next,
      expiresAt: record?.expiresAt,
    });
    return next;
  }

  async rpush(key: string, ...values: string[]): Promise<number> {
    const record = this.read(key);
    const list = record?.kind === "list" ? record.value : [];
    list.push(...values);
    this.store.set(key, { kind: "list", value: list, expiresAt: record?.expiresAt });
    return list.length;
  }

  async lpush(key: string, ...values: string[]): Promise<number> {
    const record = this.read(key);
    const list = record?.kind === "list" ? record.value : [];
    list.unshift(...values);
    this.store.set(key, { kind: "list", value: list, expiresAt: record?.expiresAt });
    return list.length;
  }

  async ltrim(key: string, start: number, stop: number): Promise<"OK"> {
    const record = this.read(key);
    if (record?.kind !== "list") return "OK";
    record.value = sliceList(record.value, start, stop);
    this.store.set(key, record);
    return "OK";
  }

  async lrange(key: string, start: number, stop: number): Promise<string[]> {
    const record = this.read(key);
    if (record?.kind !== "list") return [];
    return sliceList(record.value, start, stop);
  }

  async sadd(key: string, ...members: string[]): Promise<number> {
    const record = this.read(key);
    const set = record?.kind === "set" ? record.value : new Set<string>();
    let added = 0;
    for (const member of members) {
      if (!set.has(member)) {
        set.add(member);
        added += 1;
      }
    }
    this.store.set(key, { kind: "set", value: set, expiresAt: record?.expiresAt });
    return added;
  }

  async srem(key: string, ...members: string[]): Promise<number> {
    const record = this.read(key);
    if (record?.kind !== "set") return 0;
    let removed = 0;
    for (const member of members) {
      if (record.value.delete(member)) removed += 1;
    }
    return removed;
  }

  async smembers(key: string): Promise<string[]> {
    const record = this.read(key);
    if (record?.kind !== "set") return [];
    return [...record.value];
  }

  async pfadd(key: string, ...members: string[]): Promise<number> {
    const record = this.read(key);
    const set = record?.kind === "hll" ? record.value : new Set<string>();
    const before = set.size;
    for (const member of members) set.add(member);
    this.store.set(key, { kind: "hll", value: set, expiresAt: record?.expiresAt });
    return set.size === before ? 0 : 1;
  }

  async pfcount(...keys: string[]): Promise<number> {
    const union = new Set<string>();
    for (const key of keys) {
      const record = this.read(key);
      if (record?.kind === "hll") for (const member of record.value) union.add(member);
    }
    return union.size;
  }

  multi(): MemoryPipeline {
    return new MemoryPipeline(this);
  }
}

type Queued = () => Promise<unknown>;

class MemoryPipeline {
  private readonly ops: Queued[] = [];

  constructor(private readonly cache: MemoryCache) {}

  set(key: string, value: string, mode?: "EX", ttlSeconds?: number): this {
    this.ops.push(() => this.cache.set(key, value, mode, ttlSeconds));
    return this;
  }

  expire(key: string, ttlSeconds: number): this {
    this.ops.push(() => this.cache.expire(key, ttlSeconds));
    return this;
  }

  incr(key: string): this {
    this.ops.push(() => this.cache.incr(key));
    return this;
  }

  sadd(key: string, ...members: string[]): this {
    this.ops.push(() => this.cache.sadd(key, ...members));
    return this;
  }

  rpush(key: string, ...values: string[]): this {
    this.ops.push(() => this.cache.rpush(key, ...values));
    return this;
  }

  lpush(key: string, ...values: string[]): this {
    this.ops.push(() => this.cache.lpush(key, ...values));
    return this;
  }

  ltrim(key: string, start: number, stop: number): this {
    this.ops.push(() => this.cache.ltrim(key, start, stop));
    return this;
  }

  pfadd(key: string, ...members: string[]): this {
    this.ops.push(() => this.cache.pfadd(key, ...members));
    return this;
  }

  pfcount(...keys: string[]): this {
    this.ops.push(() => this.cache.pfcount(...keys));
    return this;
  }

  async exec(): Promise<[Error | null, unknown][]> {
    const results: [Error | null, unknown][] = [];
    for (const op of this.ops) {
      try {
        results.push([null, await op()]);
      } catch (error) {
        results.push([error instanceof Error ? error : new Error(String(error)), null]);
      }
    }
    return results;
  }
}
